/** 构建后置步骤：把窗口图标等运行时资源拷进 out/（electron-vite 不自动复制 main 的 ?asset）。 */
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
mkdirSync(join(root, 'out', 'resources'), { recursive: true })
copyFileSync(join(root, 'resources', 'icon.png'), join(root, 'out', 'resources', 'icon.png'))
console.log('[copy-assets] resources/icon.png -> out/resources/icon.png')
