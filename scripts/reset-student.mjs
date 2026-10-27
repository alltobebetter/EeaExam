#!/usr/bin/env node
/**
 * 考务管理小工具（本场「一考一号」，需要人工放行时用）
 *
 * 用法：
 *   node scripts/reset-student.mjs list                    列出已登录考生
 *   node scripts/reset-student.mjs reset "张三" "2024301001"  清空该考生的账号与全部作答数据
 *
 * 什么时候用：
 *   - 考生把姓名/学号/语言填错了，需要重新建档
 *   - 考生在另一台机器上已登录、这台进不去（先 reset 旧的，再用同一学号登录）
 *   - 特殊情况批准重考（会连同草稿、AI 记录、交卷记录一起清掉）
 *
 * 只改本机 server/data/db.json；脚本需停服务或由 systemd 重启前执行更稳妥（写临时文件后原子替换）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_FILE = path.join(__dirname, '..', 'server', 'data', 'db.json')

const [cmd, ...args] = process.argv.slice(2)

if (!fs.existsSync(DB_FILE)) {
  console.error(`[reset] 未找到 ${DB_FILE}，请先启动过后端`)
  process.exit(1)
}

const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))

function persist() {
  const tmp = DB_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2))
  fs.renameSync(tmp, DB_FILE)
}

function list() {
  const users = db.users ?? []
  if (users.length === 0) {
    console.log('（还没有考生登录）')
    return
  }
  const subs = new Map((db.submissions ?? []).map((s) => [s.userId, s]))
  console.log('学号\t姓名\t语言\t状态\t交卷时间')
  for (const u of users) {
    const sub = subs.get(u.id)
    const draftCount = Object.values(db.drafts?.[u.id] ?? {}).filter((langs) =>
      Object.values(langs ?? {}).some((c) => String(c ?? '').trim().length > 0)
    ).length
    const status = sub ? `已交卷(${sub.solvedCount ?? 0}题)` : `作答中(${draftCount}题)`
    console.log(`${u.studentId ?? '-'}\t${u.name}\t${u.language ?? '-'}\t${status}\t${sub?.submittedAt ?? '-'}`)
  }
}

function reset(studentId) {
  if (!studentId) {
    console.error('用法：node scripts/reset-student.mjs reset "学号"')
    process.exit(1)
  }
  const targets = (db.users ?? []).filter((u) => u.studentId === studentId)
  if (targets.length === 0) {
    console.error(`未找到学号：${studentId}`)
    process.exit(1)
  }
  for (const u of targets) {
    db.users = (db.users ?? []).filter((x) => x.id !== u.id)
    for (const [token, uid] of Object.entries(db.tokens ?? {})) {
      if (uid === u.id) delete db.tokens[token]
    }
    delete db.drafts?.[u.id]
    delete db.chats?.[u.id]
    delete db.meta?.[u.id]
    delete db.tokenUsage?.[u.id]
    db.submissions = (db.submissions ?? []).filter((s) => s.userId !== u.id)
    db.results = (db.results ?? []).filter((r) => r.userId !== u.id)
  }
  persist()
  console.log(`已重置学号 ${studentId}：账号、草稿、AI 记录、交卷记录均已清除，可重新登录。`)
}

switch (cmd) {
  case 'list':
    list()
    break
  case 'reset':
    reset(args[0])
    break
  default:
    console.log('用法：')
    console.log('  node scripts/reset-student.mjs list')
    console.log('  node scripts/reset-student.mjs reset "学号"')
}
