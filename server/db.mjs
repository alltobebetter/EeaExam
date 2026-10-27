/**
 * JSON 文件存储层 + 种子数据
 * db.json 运行时生成于 server/data/，包含：考生/令牌/草稿/交卷记录
 * 题库见 ./questions.mjs（QUESTIONS 可下发，TEST_SETS 含隐藏用例永不下发）
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { TEST_SETS } from './questions.mjs'

export { TEST_SETS }

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')

let db

export function loadDB() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    // 兼容旧库：补齐新增字段（缺哪个补哪个，避免直接 push 崩溃）
    db.users ??= []
    db.tokens ??= {}
    db.results ??= []
    db.drafts ??= {}
    db.submissions ??= []
    db.tokenUsage ??= {}
    db.chats ??= {}
    db.meta ??= {}
  } else {
    db = { users: [], tokens: {}, results: [], drafts: {}, submissions: [], tokenUsage: {}, chats: {}, meta: {} }
    persist()
  }
}

/** 原子写入（写临时文件后重命名），避免中途崩溃损坏数据 */
function persist() {
  const tmp = DB_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2))
  fs.renameSync(tmp, DB_FILE)
}

/**
 * 登录 = 建档（一考一号，只允许首次进入）。
 * 考生自填姓名 + 学号 + 考试语言，无花名册校验（填谁是谁）。
 * 该学号已存在则直接拒绝：本场不允许二次登录，防止顶替或换机续写。
 * 语言在建档时一次写入，之后不可更改。
 */
export function login(body) {
  if (!body || typeof body !== 'object') return { ok: false, error: '请输入姓名、学号和考试语言' }
  const name = String(body.name ?? '').trim()
  const studentId = String(body.studentId ?? '').trim()
  const language = String(body.language ?? '').trim()

  if (!name) return { ok: false, error: '请输入姓名' }
  if (!studentId) return { ok: false, error: '请输入学号' }
  if (name.length > 32 || studentId.length > 32) return { ok: false, error: '姓名或学号过长' }
  if (!['python', 'java', 'c', 'cpp'].includes(language)) return { ok: false, error: '请选择考试语言' }

  // 一考一号：学号是唯一键，已存在即拒绝（不再复用旧记录续答）
  const exists = db.users.find((u) => u.studentId === studentId)
  if (exists) {
    return { ok: false, error: '该学号已登录过，本场无法再次登录', code: 'DUPLICATE' }
  }

  const user = {
    id: crypto.randomUUID(),
    name,
    studentId,
    language, // 建档时一次写入，之后不可更改
    createdAt: new Date().toISOString()
  }
  db.users.push(user)

  const token = crypto.randomBytes(24).toString('hex')
  db.tokens[token] = user.id
  persist()
  return {
    ok: true,
    token,
    user: { id: user.id, name: user.name, studentId: user.studentId, language: user.language }
  }
}

export function getUserByToken(token) {
  const uid = db.tokens[token]
  if (!uid) return null
  const u = db.users.find((x) => x.id === uid)
  return u ? { id: u.id, name: u.name, studentId: u.studentId ?? '', language: u.language ?? null } : null
}

/** 保存代码草稿（实时自动保存）—— 已交卷后拒绝写入 */
export function saveDraft(userId, questionId, language, code) {
  if (isExamLocked(userId)) throw new Error('试卷已锁定，无法保存')
  if (!TEST_SETS[questionId]) throw new Error('题目不存在')
  if (!['python', 'java', 'c', 'cpp'].includes(language)) throw new Error('语言不支持')
  if (typeof code !== 'string' || code.length > 200 * 1024) throw new Error('代码过长')
  db.drafts[userId] ??= {}
  db.drafts[userId][questionId] ??= {}
  db.drafts[userId][questionId][language] = code
  persist()
}

export function isExamLocked(userId) {
  return !!db.submissions.find((s) => s.userId === userId)
}

/** 考生完整状态：草稿 + 已作答题目（草稿非空） + 当前题号（换机器/刷新后恢复） */
export function getState(userId) {
  const drafts = db.drafts[userId] ?? {}
  // 已作答 = 有任意语言草稿非空（去判题化后不再有通过概念）
  const answered = Object.entries(drafts)
    .filter(([, langs]) => Object.values(langs ?? {}).some((c) => String(c ?? '').trim().length > 0))
    .map(([qid]) => qid)
  return { drafts, answered, solved: answered, results: {}, activeQuestion: db.meta[userId]?.activeQuestion ?? null }
}

/** 当前题号同步：换题即存，登录时恢复（收卷后锁定，与草稿/结果一致） */
export function setActiveQuestion(userId, questionId) {
  if (isExamLocked(userId)) throw new Error('试卷已锁定，无法保存')
  if (!TEST_SETS[questionId]) throw new Error('题目不存在')
  db.meta[userId] ??= {}
  db.meta[userId].activeQuestion = questionId
  persist()
}

/** AI 聊天记录：按考生+题目隔离存后端（前端每次全量覆盖本题的一份，收卷后锁定） */
const MAX_CHAT_ITEMS = 60

export function saveChats(userId, questionId, items) {
  if (isExamLocked(userId)) throw new Error('试卷已锁定，无法保存')
  if (!TEST_SETS[questionId]) throw new Error('题目不存在')
  if (!Array.isArray(items)) throw new Error('参数不完整')
  const clean = items.slice(-MAX_CHAT_ITEMS).map((m) => ({
    kind: m.kind === 'user' ? 'user' : m.kind === 'tool' ? 'tool' : 'assistant-text',
    content: String(m.content ?? '').slice(0, 8000),
    reasoning: String(m.reasoning ?? '').slice(0, 8000),
    toolName: String(m.toolName ?? '').slice(0, 64),
    toolResult: String(m.toolResult ?? '').slice(0, 2000)
  }))
  db.chats[userId] ??= {}
  db.chats[userId][questionId] = clean
  persist()
}

export function getChats(userId, questionId) {
  return db.chats[userId]?.[questionId] ?? []
}

export function clearChats(userId, questionId) {
  if (db.chats[userId]?.[questionId]) {
    delete db.chats[userId][questionId]
    persist()
  }
}

/** 交卷：记录提交时刻与已作答题数（无在线判题，成绩考后离线评定），幂等 */
export function submitExam(userId) {
  const drafts = db.drafts[userId] ?? {}
  const answered = Object.entries(drafts)
    .filter(([, langs]) => Object.values(langs ?? {}).some((c) => String(c ?? '').trim().length > 0))
    .map(([qid]) => qid)
  const prev = db.submissions.find((s) => s.userId === userId)
  if (prev) {
    prev.submittedAt = new Date().toISOString()
    prev.solvedCount = answered.length
    prev.solvedIds = answered
    prev.answeredIds = answered
  } else {
    db.submissions.push({
      userId,
      submittedAt: new Date().toISOString(),
      solvedCount: answered.length,
      solvedIds: answered,
      answeredIds: answered
    })
  }
  persist()
  return { solvedCount: answered.length, solvedIds: answered, answeredIds: answered }
}

export function getSubmission(userId) {
  return db.submissions.find((s) => s.userId === userId) ?? null
}

/** Token 计量：输入+输出合计，按选手累计 */
export function addTokens(userId, delta) {
  db.tokenUsage ??= {}
  const n = Math.max(0, Math.floor(delta))
  if (n <= 0) return db.tokenUsage[userId] ?? 0
  db.tokenUsage[userId] = (db.tokenUsage[userId] ?? 0) + n
  persist()
  return db.tokenUsage[userId]
}
export function getTokens(userId) {
  return db.tokenUsage?.[userId] ?? 0
}

/** 供 AI 工具调用：各题作答状态总览（无判题，仅按草稿是否非空） */
export function getProgressSummary(userId) {
  const drafts = db.drafts[userId] ?? {}
  const answered = new Set(
    Object.entries(drafts)
      .filter(([, langs]) => Object.values(langs ?? {}).some((c) => String(c ?? '').trim().length > 0))
      .map(([qid]) => qid)
  )
  if (answered.size === 0) return '尚未开始作答。'
  const lines = []
  for (const qid of Object.keys(TEST_SETS)) {
    lines.push(`${qid}: ${answered.has(qid) ? '已作答' : '未开始'}`)
  }
  return [...lines, `当前进度：${answered.size}/${lines.length} 题已作答（考后离线评分）`].join('\n')
}
