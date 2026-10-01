import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // ---------- 窗口控制 ----------
  minimize: (): void => ipcRenderer.send('window:minimize'),
  toggleMaximize: (): void => ipcRenderer.send('window:toggle-maximize'),
  close: (): void => ipcRenderer.send('window:close'),
  isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:is-maximized'),
  onMaximizedChange: (callback: (maximized: boolean) => void): (() => void) => {
    const listener = (_: Electron.IpcRendererEvent, maximized: boolean): void => callback(maximized)
    ipcRenderer.on('window:maximized-changed', listener)
    return () => ipcRenderer.removeListener('window:maximized-changed', listener)
  },

  // ---------- 菜单动作 ----------
  zoom: (delta: number): void => ipcRenderer.send('view:zoom', delta),
  toggleFullscreen: (): void => ipcRenderer.send('view:toggle-fullscreen'),
  isFullscreen: (): Promise<boolean> => ipcRenderer.invoke('view:is-fullscreen'),
  onFullscreenChange: (callback: (fullscreen: boolean) => void): (() => void) => {
    const listener = (_: Electron.IpcRendererEvent, fullscreen: boolean): void =>
      callback(fullscreen)
    ipcRenderer.on('view:fullscreen-changed', listener)
    return () => ipcRenderer.removeListener('view:fullscreen-changed', listener)
  }
}

export type Api = typeof api

contextBridge.exposeInMainWorld('api', api)
