import type { Api } from '../../preload/index'

/**
 * 浏览器直访 dev server 时不存在 preload 注入的 window.api，
 * 返回 no-op 模拟对象，保证 UI 可正常渲染预览（菜单/窗口控制无实际效果）。
 */
const browserMock: Api = {
  minimize: () => {},
  toggleMaximize: () => {},
  close: () => {},
  isMaximized: async () => false,
  onMaximizedChange: () => () => {},
  zoom: () => {},
  toggleFullscreen: () => {},
  isFullscreen: async () => false,
  onFullscreenChange: () => () => {}
}

export const api: Api = window.api ?? browserMock
