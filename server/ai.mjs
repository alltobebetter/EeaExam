/**
 * AI 流式代理：硅基流动（OpenAI 兼容协议）
 * - 思考链（reasoning_content）与正文分别以 SSE 事件转发
 * - 服务端编排只读工具调用（读题目/读代码/作答进度），最多 4 轮
 * - 无在线判题：不提供判题结果工具，成绩考后离线评定
 */
import fs from 'node:fs'
import https from 'node:https'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getProgressSummary, addTokens, getTokens } from './db.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let config = {
  baseUrl: 'https://api.siliconflow.cn/v1',
  apiKey: process.env.SILICONFLOW_API_KEY ?? '',
  model: 'deepseek-ai/DeepSeek-V4-Flash'
}

// 配置优先级：环境变量 > server/config.json（已 gitignore）
// server/config.json: { "apiKey": "...", "baseUrl": "...", "model": "..." }
const CONFIG_FILE = path.join(__dirname, 'config.json')
if (fs.existsSync(CONFIG_FILE)) {
  try {
    const fileCfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
    // 文件中的 apiKey 仅在环境变量未设置时生效，避免明文覆盖 env
    if (!config.apiKey && fileCfg.apiKey) config.apiKey = fileCfg.apiKey
    if (fileCfg.baseUrl) config.baseUrl = fileCfg.baseUrl
    if (fileCfg.model) config.model = fileCfg.model
  } catch {
    /* 配置解析失败静默，使用默认值/env */
  }
}
if (config.apiKey && !config.apiKey.startsWith('sk-')) {
  console.warn('[eea-ai] apiKey 格式异常，应以 sk- 开头')
}

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_question_detail',
      description: '获取学生当前作答题目的完整描述（题干与输入输出示例）',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_visible_cases',
      description:
        '获取当前题目的可见示例用例的输入与期望输出（隐藏用例不提供）。需要分析“为什么某个示例没过”时可调用',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_current_code',
      description: '读取学生当前编写的代码全文（只读）',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_progress',
      description: '获取学生整场考试的作答进度（各题是否已作答，只读，无判题）',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  }
]

const SYSTEM_PROMPT = `你是"EEA Exam"考试系统的 AI 助手，服务对象是正在考试的学生。

行为准则：
1. 只允许"读"，绝不允许"写"：你可以读取题目详情、学生当前代码，但不能替学生写完整答案、不能给出可直接提交的完整代码。
2. 引导式教学：可以讲解思路、指出 Bug 所在大致位置、解释概念、给出伪代码或极小的代码片段（不超过 5 行）。
3. 需要题目/代码信息时，主动调用提供的工具获取，不要凭空猜测。无在线判题，无法帮学生运行验证，请引导其用本地编译器自测示例。
4. 用简体中文回答，语气友善、简洁，避免冗长。`

function executeTool(name, ctx) {
  switch (name) {
    case 'get_question_detail': {
      const q = ctx.context.currentQuestion
      if (!q) return '（无当前题目信息）'
      const samples = (q.samples ?? [])
        .map((s, i) => `示例${i + 1}：输入 ${s.input} → 输出 ${s.output}`)
        .join('\n')
      return `题目：${q.title}\n描述：${q.description}\n${samples}`
    }
    case 'get_current_code':
      return ctx.context.currentCode || '（学生尚未编写代码）'
    case 'get_visible_cases': {
      const q = ctx.context.currentQuestion
      if (!q) return '（无当前题目信息）'
      const samples = q.samples ?? []
      if (samples.length === 0) return '（该题没有可见示例用例）'
      return samples
        .map((s, i) => `示例 ${i + 1}\n  输入：${s.input || '（空）'}\n  期望输出：${s.output || '（空）'}`)
        .join('\n')
    }
    case 'get_progress':
      return getProgressSummary(ctx.user.id)
    default:
      return `（未知工具：${name}）`
  }
}

function estimateTokens(text) {
  if (!text) return 0
  // 近似：按 UTF-8 字节数 /3 估算，兼容中英文混合，取整向上
  try {
    return Math.max(1, Math.ceil(Buffer.byteLength(String(text), 'utf8') / 3))
  } catch {
    return Math.max(1, Math.ceil(String(text).length / 2))
  }
}

/** 调用硅基流动并流式消费一轮；返回累积的 assistant 消息与工具调用。signal 断开时中断上游请求 */
async function streamRound(messages, emit, signal) {
  // 注意：这里不用 fetch——本机 undici 的 SSE 流读取有兼容问题，node:https 实测正常
  const payload = JSON.stringify({
    model: config.model,
    stream: true,
    stream_options: { include_usage: true },
    temperature: 0.4,
    messages,
    tools: TOOLS
  })

  const { assistantMsg, finish, toolCalls, usage, content, reasoning } = await new Promise((resolve, reject) => {
    // baseUrl 可能带路径前缀（如 .../v1），拼出完整 chat 路径而非硬编码丢弃
    const base = new URL(config.baseUrl)
    const req = https.request(
      {
        hostname: base.hostname,
        port: base.port ? Number(base.port) : undefined,
        path: `${base.pathname.replace(/\/$/, '')}/chat/completions`,
        method: 'POST',
        signal,
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      },
      (res) => {
        if (res.statusCode !== 200) {
          let errText = ''
          res.on('data', (c) => (errText += c))
          res.on('end', () =>
            reject(new Error(`AI 服务错误 ${res.statusCode}: ${errText.slice(0, 300)}`))
          )
          return
        }

        let content = ''
        let reasoning = ''
        const toolCalls = []
        let finish = null
        let buffer = ''
        let usage = null

        res.on('data', (chunk) => {
          buffer += String(chunk)
          let idx
          while ((idx = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, idx).trim()
            buffer = buffer.slice(idx + 1)
            if (!line.startsWith('data:')) continue
            const body = line.slice(5).trim()
            if (body === '[DONE]') continue
            try {
              const json = JSON.parse(body)
              // 捕获用量（OpenAI 兼容：部分厂商在最后一条 data 中带 usage）
              if (json.usage) usage = json.usage
              const choice = json.choices?.[0]
              const delta = choice?.delta ?? {}
              if (delta.reasoning_content) {
                reasoning += delta.reasoning_content
                emit('reasoning', { text: delta.reasoning_content })
              }
              if (delta.content) {
                content += delta.content
                emit('delta', { text: delta.content })
              }
              for (const tc of delta.tool_calls ?? []) {
                const i = tc.index ?? 0
                toolCalls[i] ??= { id: '', name: '', args: '' }
                if (tc.id) toolCalls[i].id = tc.id
                if (tc.function?.name) toolCalls[i].name += tc.function.name
                if (tc.function?.arguments) toolCalls[i].args += tc.function.arguments
              }
              if (choice?.finish_reason) finish = choice.finish_reason
              // 有些实现把 usage 放在 choice 之外或最后一条非 delta 消息中
              if (json.usage) usage = json.usage
            } catch {
              /* 忽略无法解析的行 */
            }
          }
        })

        res.on('end', () => {
          const assistantMsg = { role: 'assistant', content }
          if (toolCalls.length > 0) {
            assistantMsg.tool_calls = toolCalls.map((tc) => ({
              id: tc.id || `call_${Math.random().toString(36).slice(2)}`,
              type: 'function',
              function: { name: tc.name, arguments: tc.args || '{}' }
            }))
          }
          resolve({
            assistantMsg,
            finish,
            toolCalls: toolCalls.map((tc) => tc.name),
            usage,
            content,
            reasoning
          })
        })
      }
    )
    req.on('error', reject)
    // 上游超时兜底，避免连接永久挂起
    req.setTimeout(60000, () => req.destroy(new Error('upstream timeout')))
    signal?.addEventListener('abort', () => req.destroy(new Error('client aborted')), { once: true })
    req.end(payload)
  })

  return { assistantMsg, finish, toolCalls, usage, content, reasoning }
}

/**
 * AI 对话主流程：agentic 工具循环（最多 4 轮）+ SSE 转发
 * body: { messages: [{role, content}], context: { currentQuestion, currentCode } }
 * signal：客户端断开连接时触发，中断所有上游 AI 请求（不再白烧 token）
 */
export async function handleAIChat(user, body, emit, signal) {
  if (!config.apiKey) {
    emit('error', { message: '服务端未配置 AI API Key（请设置环境变量 SILICONFLOW_API_KEY 或 server/config.json）' })
    return
  }

  // 初始即下发累计用量，满足计划书“控制台实时查看”
  emit('tokens', { total: getTokens(user.id) })
  const ctx = { user, context: body.context ?? {} }
  // 历史只收最近 20 条，且 role/长度收敛后再透传上游，避免脏数据烧 token 或 400
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...(Array.isArray(body.messages) ? body.messages.slice(-20) : [])
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))
  ]

  try {
    for (let round = 0; round < 4; round++) {
      const { assistantMsg, finish, toolCalls, usage, content, reasoning } = await streamRound(messages, emit, signal)
      // Token 计量：优先使用厂商返回的 usage，否则按字符估算（输入+输出合计）
      let turnTokens = 0
      if (usage && typeof usage.total_tokens === 'number') {
        turnTokens = usage.total_tokens
      } else if (usage && typeof usage.prompt_tokens === 'number') {
        turnTokens = (usage.prompt_tokens || 0) + (usage.completion_tokens || 0)
      } else {
        const promptText = messages.map((m) => m.content || '').join('\n')
        turnTokens = estimateTokens(promptText + (content || '') + (reasoning || ''))
      }
      if (turnTokens > 0) {
        const total = addTokens(user.id, turnTokens)
        emit('tokens', { total, delta: turnTokens })
      }
      messages.push(assistantMsg)

      if (finish !== 'tool_calls' || toolCalls.length === 0) break

      for (const name of toolCalls) {
        emit('tool_call', { name })
      }
      for (const tc of assistantMsg.tool_calls) {
        let result
        try {
          result = executeTool(tc.function.name, ctx)
        } catch (e) {
          result = `工具执行失败：${e?.message ?? e}`
        }
        emit('tool_result', { name: tc.function.name, result: String(result).slice(0, 500) })
        messages.push({ role: 'tool', tool_call_id: tc.id, content: result })
      }
    }
    emit('done', {})
  } catch (e) {
    // 客户端主动断开/停止：静默退出，不再报错也不再占用上游连接
    if (e?.name === 'AbortError' || signal?.aborted) return
    emit('error', { message: e?.message ?? 'AI 调用失败' })
  }
}
