/**
 * 本地会话（token + 身份）持久化。
 *
 * 本场考试「一考一号，只允许登录一次」，所以崩溃/断电/误关窗口后必须能自动续上，
 * 否则考生会被永久挡在门外（草稿还在服务器上）。返回登录会清掉它，等同于放弃本场。
 */
import type { UserInfo } from './api/backend'

const SESSION_KEY = 'eea_exam_session'

export interface SavedSession {
  token: string
  user: UserInfo
}

export function loadSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedSession
    if (!parsed?.token || !parsed?.user?.name) return null
    return parsed
  } catch {
    return null
  }
}

export function saveSession(session: SavedSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    /* 忽略存储失败：仅影响重启恢复 */
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    /* 忽略存储失败 */
  }
}
