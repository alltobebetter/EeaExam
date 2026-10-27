/**
 * 后端 API 客户端（渲染进程直连后端服务）
 * 考试部署：后端跑在盒子上，学生机直连盒子；登录页可改后端地址（localStorage），无需重打
 *
 * 代码收集与作答：只收代码草稿。
 */
import type { RunResult } from '../../../shared/types'

export const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8787'

const API_KEY_STORAGE = 'eea_api_base_url'

/** 运行时后端地址：localStorage 可覆盖，局域网集中部署时登录页直接改，无需重打 */
export function getApiBaseUrl(): string {
  try {
    const saved = localStorage.getItem(API_KEY_STORAGE)?.trim().replace(/\/$/, '')
    if (saved) return saved
  } catch {
    /* 无 localStorage（如 SSR）时回退默认 */
  }
  return DEFAULT_API_BASE_URL
}

/** 登录页输入框用：只返回用户配过的值，没配过返回空（不预填） */
export function getConfiguredApiBaseUrl(): string {
  try {
    return localStorage.getItem(API_KEY_STORAGE)?.trim().replace(/\/$/, '') ?? ''
  } catch {
    return ''
  }
}

export function setApiBaseUrl(url: string): void {
  try {
    const clean = url.trim().replace(/\/$/, '')
    if (clean) localStorage.setItem(API_KEY_STORAGE, clean)
    else localStorage.removeItem(API_KEY_STORAGE)
  } catch {
    /* 忽略存储失败 */
  }
}

/** 兼容旧引用：同一模块内统一用 getApiBaseUrl()，保留常量名避免外部断引 */
export const API_BASE_URL = DEFAULT_API_BASE_URL

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` }
}

async function getJSON<T>(path: string, token: string): Promise<T | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}${path}`, { headers: authHeaders(token) })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function postJSON(path: string, token: string, body: unknown): Promise<void> {
  try {
    await fetch(`${getApiBaseUrl()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify(body)
    })
  } catch {
    /* 静默失败，由调用方决定是否重试 */
  }
}

export interface UserInfo {
  id: string
  name: string
  /** 考生自填学号（登录时不再对花名册，也是本场唯一键） */
  studentId?: string
  /** 首登未绑定时为 null，第二屏选择后一次性写入 */
  language: string | null
}

export type { CaseResult, RunResult } from '../../../shared/types'

/** 登录 = 建档（一考一号）：姓名 + 学号 + 语言一次提交，成功即锁定身份与语言 */
export async function apiLogin(
  name: string,
  studentId: string,
  language: string
): Promise<{ ok: boolean; token?: string; user?: UserInfo; error?: string; duplicate?: boolean }> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, studentId, language })
    })
    const data = await res.json()
    return {
      ok: res.ok && data.ok,
      token: data.token,
      user: data.user,
      error: data.error,
      duplicate: res.status === 409
    }
  } catch {
    return { ok: false, error: '无法连接考试服务，请确认后端已启动' }
  }
}

/** 代码草稿实时自动保存 */
export async function apiSaveDraft(
  token: string,
  payload: { questionId: string; language: string; code: string }
): Promise<void> {
  await postJSON('/api/exam/drafts', token, payload)
}

/** 交卷 */
export async function apiSubmitExam(token: string): Promise<{ solvedCount: number; solvedIds: string[] } | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/exam/submit`, {
      method: 'POST',
      headers: authHeaders(token)
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/** 考生状态恢复：草稿 + 已作答题目 + 当前题号 + 交卷记录（无判题） */
export async function apiGetState(
  token: string
): Promise<{ drafts: Record<string, Record<string, string>>; answered: string[]; solved: string[]; results: Record<string, RunResult>; activeQuestion: string | null; submission?: { submittedAt: string; solvedCount: number; solvedIds: string[] } | null } | null> {
  return getJSON('/api/exam/state', token)
}

/** 当前题号同步（换题即存，换机器/刷新后恢复） */
export async function apiSetActiveQuestion(token: string, questionId: string): Promise<void> {
  await postJSON('/api/exam/active', token, { questionId })
}

/** 题库下发（登录后拉取；未登录/无题时返回 null，由调用方提示重试） */
export async function apiGetQuestions(
  token: string
): Promise<Array<{ id: string; title: string; difficulty: string; score: number; timeLimit: string; description: string; samples: { input: string; output: string }[]; starterCode: Record<string, string> }> | null> {
  const data = await getJSON<{ items: any[] }>('/api/exam/questions', token)
  return Array.isArray(data?.items) ? data.items : null
}

/** 聊天流元素：用户消息 / AI 文本（含思考链）/ 工具调用行（存后端，按题隔离） */
export interface ChatItem {
  kind: 'user' | 'assistant-text' | 'tool'
  content: string
  reasoning?: string
  toolName?: string
  toolResult?: string
  streaming?: boolean
}

/** 读取某题的 AI 聊天记录 */
export async function apiGetChats(token: string, questionId: string): Promise<ChatItem[] | null> {
  const data = await getJSON<{ items: ChatItem[] }>(
    `/api/ai/chats?questionId=${encodeURIComponent(questionId)}`,
    token
  )
  return data?.items ?? null
}

/** 全量覆盖某题的 AI 聊天记录（每轮对话结束后存一次） */
export async function apiSaveChats(token: string, questionId: string, items: ChatItem[]): Promise<void> {
  await postJSON('/api/ai/chats', token, {
    questionId,
    items: items.map((m) => ({ ...m, streaming: false }))
  })
}

/** 清空某题的 AI 聊天记录 */
export async function apiClearChats(token: string, questionId: string): Promise<void> {
  try {
    await fetch(`${getApiBaseUrl()}/api/ai/chats?questionId=${encodeURIComponent(questionId)}`, {
      method: 'DELETE',
      headers: authHeaders(token)
    })
  } catch {
    /* 静默失败，由调用方决定是否重试 */
  }
}

export interface ChatHandlers {
  onDelta: (text: string) => void
  onReasoning: (text: string) => void
  onToolCall: (name: string) => void
  onToolResult: (name: string, result: string) => void
  onError: (message: string) => void
  onDone: () => void
  onTokens?: (total: number, delta?: number) => void
}

export async function apiGetTokens(token: string): Promise<number | null> {
  const data = await getJSON<{ total: number }>('/api/ai/usage', token)
  return typeof data?.total === 'number' ? data.total : null
}

/** AI 工具调用所需题目上下文：只传用得到的字段，不带各语言初始代码 */
export interface AiContextQuestion {
  id: string
  title: string
  description: string
  samples: { input: string; output: string }[]
}

/** AI 流式对话（SSE）；返回 abort 函数 */
export function apiStreamChat(
  token: string,
  payload: {
    messages: { role: string; content: string }[]
    context: { currentQuestion: AiContextQuestion; currentCode: string }
  },
  handlers: ChatHandlers
): () => void {
  const controller = new AbortController()

  ;(async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
        signal: controller.signal
      })
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        handlers.onError(data.error ?? `AI 服务错误 ${res.status}`)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let done = false

      while (!done) {
        const { done: finished, value } = await reader.read()
        if (finished) break
        buf += decoder.decode(value, { stream: true })
        let idx: number
        while ((idx = buf.indexOf('\n')) !== -1) {
          const line = buf.slice(0, idx).trim()
          buf = buf.slice(idx + 1)
          if (!line.startsWith('data:')) continue
          try {
            const evt = JSON.parse(line.slice(5).trim())
            switch (evt.event) {
              case 'tokens':
                handlers.onTokens?.(evt.total ?? 0, evt.delta)
                break
              case 'delta':
                handlers.onDelta(evt.text ?? '')
                break
              case 'reasoning':
                handlers.onReasoning(evt.text ?? '')
                break
              case 'tool_call':
                handlers.onToolCall(evt.name ?? '')
                break
              case 'tool_result':
                handlers.onToolResult(evt.name ?? '', evt.result ?? '')
                break
              case 'error':
                handlers.onError(evt.message ?? 'AI 调用失败')
                break
              case 'done':
                done = true
                handlers.onDone()
                break
            }
          } catch {
            /* 忽略无法解析的行 */
          }
        }
      }
      handlers.onDone()
    } catch (e: any) {
      if (e?.name !== 'AbortError') handlers.onError(e?.message ?? '网络错误')
    }
  })()

  return () => controller.abort()
}
