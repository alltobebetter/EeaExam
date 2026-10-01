/**
 * Logo 矢量化：PNG → 单色填充 SVG
 * - 二值化阈值把 AI 生成图中深浅不一的蓝色统一压平
 * - 输出两个变体：品牌靛蓝（浅色背景用）与奶白（深色背景用）
 */
import potrace from 'potrace'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'scripts', 'logo-raw.png')
const OUT_DIR = path.join(ROOT, 'src', 'renderer', 'src', 'assets')
const BRAND = '#4b5ac9'
const WHITE = '#f5f6f8'

function trace(options) {
  return new Promise((resolve, reject) => {
    potrace.trace(SRC, options, (err, svg) => (err ? reject(err) : resolve(svg)))
  })
}

const main = async () => {
  // 二值描摹：阈值内所有像素统一为单色填充
  let svg = await trace({ threshold: 170, color: BRAND, optTolerance: 0.4, turdSize: 100 })

  // 规范化：去掉生成器自带的固定宽高，保留 viewBox；补充 xmlns 确认
  svg = svg
    .replace(/<\?xml[^>]*\?>\s*/g, '')
    .replace(/<!DOCTYPE[^>]*>\s*/g, '')
    .replace(/\s(width|height)="[^"]*"/g, '')
    .replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')

  fs.writeFileSync(path.join(OUT_DIR, 'logo.svg'), svg)

  // 深色背景用的奶白变体
  const svgWhite = svg.replace(/fill="#4b5ac9"/g, `fill="${WHITE}"`)
  fs.writeFileSync(path.join(OUT_DIR, 'logo-white.svg'), svgWhite)

  const sizeKB = (p) => (fs.statSync(p).size / 1024).toFixed(1)
  console.log(`logo.svg ${sizeKB(path.join(OUT_DIR, 'logo.svg'))}KB`)
  console.log(`logo-white.svg ${sizeKB(path.join(OUT_DIR, 'logo-white.svg'))}KB`)
  console.log('paths:', (svg.match(/<path/g) ?? []).length)
}

main().catch((e) => { console.error(e); process.exit(1) })
