/** 一键双开：后端 server/index.mjs + 前端 electron-vite dev */
import { spawn } from 'node:child_process'

const procs = [
  spawn('node', ['server/index.mjs'], { stdio: 'inherit', shell: true }),
  spawn('npx', ['electron-vite', 'dev'], { stdio: 'inherit', shell: true })
]
const kill = () => procs.forEach((p) => { try { p.kill() } catch {} })
process.on('SIGINT', () => { kill(); process.exit(0) })
process.on('exit', kill)
