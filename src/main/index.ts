import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron'
import { join } from 'path'
import icon from '../../resources/icon.png?asset'

// Windows 任务栏分组/图标归属：必须与打包配置的 appId 一致
const APP_ID = 'cn.edu.xizang.eea-exam'
app.setAppUserModelId(APP_ID)
if (process.platform === 'win32') app.setName('EEA Exam')

// 模块级引用，保证 IPC handler 只注册一次，窗口重建后依然指向正确实例
let win: BrowserWindow | null = null

function createWindow(): void {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 620,
    show: false,
    frame: false, // 自定义标题栏
    title: 'EEA Exam',
    icon, // 开发态任务栏图标；打包后 EXE 图标见 electron-builder 配置
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#141519' : '#f5f6f8',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  win.on('ready-to-show', () => win?.show())

  // 向渲染进程同步最大化状态，用于切换 恢复/最大化 图标
  const sendMaximized = (): void => win?.webContents.send('window:maximized-changed', win.isMaximized())
  win.on('maximize', sendMaximized)
  win.on('unmaximize', sendMaximized)
  const sendFullscreen = (): void => win?.webContents.send('view:fullscreen-changed', win.isFullScreen())
  win.on('enter-full-screen', sendFullscreen)
  win.on('leave-full-screen', sendFullscreen)
  win.on('closed', () => {
    win = null
  })

  // 开发环境加载 vite dev server，生产环境加载构建产物
  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function getWin(): BrowserWindow {
  if (!win) throw new Error('main window not initialized')
  return win
}

app.whenReady().then(() => {
  // ---------- 窗口控制 ----------
  ipcMain.on('window:minimize', () => getWin().minimize())
  ipcMain.on('window:toggle-maximize', () => {
    const w = getWin()
    if (w.isMaximized()) w.unmaximize()
    else w.maximize()
  })
  ipcMain.on('window:close', () => getWin().close())
  ipcMain.handle('window:is-maximized', () => win?.isMaximized() ?? false)

  // ---------- 菜单动作 ----------
  ipcMain.on('view:zoom', (_, delta: number) => {
    if (!Number.isFinite(delta)) return
    const wc = getWin().webContents
    if (delta === 0) wc.setZoomLevel(0)
    else wc.setZoomLevel(wc.getZoomLevel() + Math.max(-3, Math.min(3, delta)))
  })
  ipcMain.on('view:toggle-fullscreen', () => {
    const w = getWin()
    w.setFullScreen(!w.isFullScreen())
  })
  ipcMain.handle('view:is-fullscreen', () => win?.isFullScreen() ?? false)

  // 代码收集模式：学生机上编写，交卷后统一处理
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
