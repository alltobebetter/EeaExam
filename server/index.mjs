/**
 * EEA Exam 后端服务（零 npm 依赖，纯 Node http + JSON 文件存储）
 *
 * 设计要点：
 * - 鉴权：登录（姓名+学号）换 Bearer Token，后续接口均需鉴权
 * - 数据：server/data/db.json（运行时生成，含名册/令牌/草稿/交卷记录）
 * - AI：POST /api/ai/chat 转发硅基流动（OpenAI 兼容协议），支持工具调用与思考链流式转发
 * - 判分：无在线判题，只收代码草稿，考后离线评分（见 scripts/export.mjs）
 * - 迁移：部署到服务器后客户端只需改 API_BASE_URL
 */
import http from 'node:http'
import { handleAIChat } from './ai.mjs'
import {
  login,
  getUserByToken,
  loadDB,
  saveDraft,
  getState,
  submitExam,
  getSubmission,
  getTokens,
  setActiveQuestion,
  saveChats,
  getChats,
  clearChats,
  bindLanguage,
  TEST_SETS
} from './db.mjs'
import { QUESTIONS } from './questions.mjs'

const PORT = Number(process.env.PORT || 8787)

const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://localhost:8787',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8787'
])

function getCorsHeaders(req) {
  const origin = req.headers.origin ?? ''
  // Electron file:// / app:// 无 Origin 或为 null，直接放行；否则仅回显白名单
  if (!origin || origin === 'null' || origin.startsWith('file://') || origin.startsWith('app://')) {
    return {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  }
  if (ALLOWED_ORIGINS.has(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      Vary: 'Origin'
    }
  }
  return {
    'Access-Control-Allow-Origin': 'null',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

function sendJSON(res, status, data, req) {
  const headers = req ? getCorsHeaders(req) : CORS_HEADERS
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers })
  res.end(JSON.stringify(data))
}

/** 读取请求体并解析 JSON（限制 1MB） */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > 1024 * 1024) {
        reject(new Error('body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'))
      } catch {
        reject(new Error('invalid json'))
      }
    })
    req.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)

  if (req.method === 'OPTIONS') {
    res.writeHead(204, getCorsHeaders(req))
    res.end()
    return
  }

  try {
    // ---------- 登录（无需鉴权） ----------
    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      const body = await readBody(req)
      const result = login(body)
      if (!result.ok) return sendJSON(res, 401, { error: result.error })
      return sendJSON(res, 200, result)
    }

    // ---------- 以下接口均需鉴权 ----------
    const auth = req.headers.authorization ?? ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    const user = getUserByToken(token)
    if (!user) return sendJSON(res, 401, { error: '未登录或登录已过期' }, req)

    // 题库下发（登录后可见，含题干+可见示例；隐藏用例永不下发）
    if (req.method === 'GET' && url.pathname === '/api/exam/questions') {
      return sendJSON(res, 200, { items: QUESTIONS }, req)
    }

    // 考试语言一次性绑定（第二屏提交；已绑定后拒绝，语言不可更改）
    if (req.method === 'POST' && url.pathname === '/api/exam/language') {
      const body = await readBody(req)
      const result = bindLanguage(user.id, body.language)
      if (!result.ok) return sendJSON(res, 400, { error: result.error }, req)
      return sendJSON(res, 200, result, req)
    }

    // 代码草稿实时自动保存（已收卷后拒绝，以防篡改）
    if (req.method === 'POST' && url.pathname === '/api/exam/drafts') {
      const body = await readBody(req)
      if (!body.questionId || !body.language || typeof body.code !== 'string')
        return sendJSON(res, 400, { error: '参数不完整' }, req)
      try {
        saveDraft(user.id, body.questionId, body.language, body.code)
      } catch (e) {
        return sendJSON(res, 403, { error: e?.message ?? '试卷已锁定' }, req)
      }
      return sendJSON(res, 200, { ok: true }, req)
    }

    // 考生状态恢复（草稿 + 已作答题目 + 当前题号 + 是否已交卷）
    if (req.method === 'GET' && url.pathname === '/api/exam/state') {
      const state = getState(user.id)
      const submission = getSubmission(user.id)
      return sendJSON(res, 200, { ...state, submission }, req)
    }

    // 当前题号同步（换题即存，换机器/刷新后恢复；收卷后 403）
    if (req.method === 'POST' && url.pathname === '/api/exam/active') {
      const body = await readBody(req)
      try {
        setActiveQuestion(user.id, body.questionId)
      } catch (e) {
        const locked = /锁定/.test(e?.message ?? '')
        return sendJSON(res, locked ? 403 : 400, { error: e?.message ?? 'bad request' }, req)
      }
      return sendJSON(res, 200, { ok: true }, req)
    }

    // 交卷（时间到自动收卷与手动提交共用）
    if (req.method === 'POST' && url.pathname === '/api/exam/submit') {
      const result = submitExam(user.id)
      return sendJSON(res, 200, { ok: true, ...result }, req)
    }

    // AI 用量查询（计划书：控制台实时查看本人用量，输入+输出合计）
    if (req.method === 'GET' && url.pathname === '/api/ai/usage') {
      const total = getTokens(user.id)
      return sendJSON(res, 200, { total }, req)
    }

    // AI 聊天记录（按题隔离存后端，换机器可恢复）
    if (req.method === 'GET' && url.pathname === '/api/ai/chats') {
      const qid = url.searchParams.get('questionId') ?? ''
      if (!TEST_SETS[qid]) return sendJSON(res, 400, { error: '题目不存在' }, req)
      return sendJSON(res, 200, { items: getChats(user.id, qid) }, req)
    }

    // AI 聊天记录全量覆盖（每轮对话结束后存一次；收卷后 403）
    if (req.method === 'POST' && url.pathname === '/api/ai/chats') {
      const body = await readBody(req)
      try {
        saveChats(user.id, body.questionId, body.items)
      } catch (e) {
        const locked = /锁定/.test(e?.message ?? '')
        return sendJSON(res, locked ? 403 : 400, { error: e?.message ?? 'bad request' }, req)
      }
      return sendJSON(res, 200, { ok: true }, req)
    }

    // AI 聊天记录清空（按题）
    if (req.method === 'DELETE' && url.pathname === '/api/ai/chats') {
      const qid = url.searchParams.get('questionId') ?? ''
      if (!TEST_SETS[qid]) return sendJSON(res, 400, { error: '题目不存在' }, req)
      clearChats(user.id, qid)
      return sendJSON(res, 200, { ok: true }, req)
    }

    // AI 流式对话（SSE，服务端编排工具调用）
    if (req.method === 'POST' && url.pathname === '/api/ai/chat') {
      const body = await readBody(req)
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        ...getCorsHeaders(req)
      })
      // 客户端断开（停止生成/关窗口）时中断上游 AI 请求，不再白烧 token
      const ac = new AbortController()
      req.on('close', () => ac.abort(new Error('client closed')))
      // 连接已断开后不再向 res 写数据（避免 write after end）
      const safeEmit = (event, data) => {
        if (res.destroyed || res.writableEnded) return
        res.write(`data: ${JSON.stringify({ event, ...data })}\n\n`)
      }
      await handleAIChat(user, body, safeEmit, ac.signal)
      res.end()
      return
    }

    sendJSON(res, 404, { error: 'not found' }, req)
  } catch (err) {
    if (!res.headersSent) sendJSON(res, 400, { error: err?.message ?? 'bad request' }, req)
    else res.end()
  }
})

loadDB()
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[eea-server] 端口 ${PORT} 已被占用：可能已有一个后端实例在运行。`)
    console.error(`Windows 可执行：netstat -ano | findstr :${PORT} 找到 PID，再 taskkill /F /PID <PID>`)
    process.exit(1)
  }
  throw err
})
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[eea-server] listening on http://0.0.0.0:${PORT}`)
})
