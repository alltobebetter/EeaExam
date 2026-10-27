/**
 * 考后导出：把 server/data/db.json 里各人各题终版草稿导出为文件
 * 用法：node scripts/export.mjs [outDir]
 * 输出：<outDir>/<学号>_<姓名>/<题号>.<ext> + manifest.csv（学号,姓名,语言,已作答题数,交卷时间）
 * 无在线判题，老师用本地编译器/脚本离线评分。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_FILE = path.join(__dirname, '..', 'server', 'data', 'db.json')
const OUT_DIR = path.resolve(process.argv[2] ?? path.join(__dirname, '..', 'export'))

const EXT = { python: 'py', java: 'java', c: 'c', cpp: 'cpp' }

if (!fs.existsSync(DB_FILE)) {
  console.error(`[export] 未找到 ${DB_FILE}，请先启动后端产生数据`)
  process.exit(1)
}
const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
const users = new Map((db.users ?? []).map((u) => [u.id, u]))
const submissions = new Map((db.submissions ?? []).map((s) => [s.userId, s]))

fs.rmSync(OUT_DIR, { recursive: true, force: true })
fs.mkdirSync(OUT_DIR, { recursive: true })

const rows = ['studentId,name,language,answeredCount,submittedAt']
for (const [userId, perQ] of Object.entries(db.drafts ?? {})) {
  const u = users.get(userId)
  if (!u) continue
  const dir = path.join(OUT_DIR, `${u.studentId ?? '未知学号'}_${u.name}`)
  fs.mkdirSync(dir, { recursive: true })
  const lang = u.language ?? 'python'
  let count = 0
  for (const [qid, langs] of Object.entries(perQ ?? {})) {
    const code = langs?.[lang] ?? Object.values(langs ?? {})[0] ?? ''
    if (String(code).trim().length === 0) continue
    count++
    fs.writeFileSync(path.join(dir, `${qid}.${EXT[lang] ?? 'txt'}`), String(code))
  }
  const sub = submissions.get(userId)
  rows.push([u.studentId ?? '', u.name, lang, count, sub?.submittedAt ?? ''].join(','))
}
fs.writeFileSync(path.join(OUT_DIR, 'manifest.csv'), '\uFEFF' + rows.join('\n'))
console.log(`[export] done -> ${OUT_DIR}`)
