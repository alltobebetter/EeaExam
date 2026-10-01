import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import Modal from './Modal'
import logoUrl from '../assets/logo.svg'
import {
  Copy,
  Info,
  Maximize,
  Minus,
  PencilLine,
  RotateCcw,
  Square,
  X,
  ZoomIn,
  ZoomOut
} from 'lucide-react'

interface MenuItem {
  label?: string
  shortcut?: string
  icon?: React.ComponentType<{ size?: number | string }>
  separator?: boolean
  disabled?: boolean
  action?: () => void
  dialog?: 'about' | 'rules'
}

interface Menu {
  label: string
  items: MenuItem[]
}

const MENUS: Menu[] = [
  {
    label: '视图',
    items: [
      { label: '放大', shortcut: 'Ctrl + =', icon: ZoomIn, action: () => api.zoom(0.5) },
      { label: '缩小', shortcut: 'Ctrl + -', icon: ZoomOut, action: () => api.zoom(-0.5) },
      { label: '重置缩放', shortcut: 'Ctrl + 0', icon: RotateCcw, action: () => api.zoom(0) },
      { separator: true },
      { label: '切换全屏', shortcut: 'F11', icon: Maximize, action: () => api.toggleFullscreen() }
    ]
  },
  {
    label: '帮助',
    items: [
      { label: '关于 EEA Exam', icon: Info, dialog: 'about' },
      { label: '考试规则说明', icon: PencilLine, dialog: 'rules' }
    ]
  }
]

export default function TitleBar({
  userName,
  minimal = false,
  onSubmit
}: {
  userName?: string
  minimal?: boolean
  onSubmit?: () => void
}): React.JSX.Element {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(-1) // 键盘高亮的菜单项下标
  const [maximized, setMaximized] = useState(false)
  const [dialog, setDialog] = useState<'about' | 'rules' | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)

  // 弹窗与全屏文案：按组件状态动态绑定
  const menus: Menu[] = MENUS.map((menu) => {
    const items = menu.items.map((item) => ({
      ...item,
      action: item.dialog ? () => setDialog(item.dialog as 'about' | 'rules') : item.action
    }))
    if (menu.label === '视图') {
      return {
        ...menu,
        items: items.map((item) =>
          item.label === '切换全屏'
            ? { ...item, label: fullscreen ? '退出全屏' : '切换全屏' }
            : item
        )
      }
    }
    return { ...menu, items }
  })

  useEffect(() => {
    api.isMaximized().then(setMaximized)
    return api.onMaximizedChange(setMaximized)
  }, [])

  // 全屏状态用于动态文案
  useEffect(() => {
    const off = api.onFullscreenChange(setFullscreen)
    api.isFullscreen().then(setFullscreen)
    return off
  }, [])

  const closeMenu = (): void => {
    setOpenMenu(null)
    setActiveIndex(-1)
  }

  // 点击外部 / Esc 关闭下拉菜单；窗口失焦时也关闭（VS Code 行为）
  useEffect(() => {
    if (!openMenu) return
    const onDown = (e: MouseEvent): void => {
      if (!barRef.current?.contains(e.target as Node)) setOpenMenu(null)
    }
    window.addEventListener('blur', closeMenu)
    document.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('blur', closeMenu)
      document.removeEventListener('mousedown', onDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openMenu])

  const runItem = (item: MenuItem): void => {
    if (item.disabled) return
    closeMenu()
    item.action?.()
  }

  // 键盘导航：←/→ 切换顶级菜单，↑/↓ 移动高亮，Enter 执行，Esc 关闭
  const onBarKeyDown = (e: React.KeyboardEvent): void => {
    if (!openMenu) return
    const menu = menus.find((m) => m.label === openMenu)
    if (!menu) return
    const selectable = menu.items
      .map((item, i) => ({ item, i }))
      .filter(({ item }) => !item.separator && !item.disabled)

    if (e.key === 'Escape') {
      e.preventDefault()
      closeMenu()
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const delta = e.key === 'ArrowRight' ? 1 : -1
      const next = menus[(menus.findIndex((m) => m.label === openMenu) + delta + menus.length) % menus.length]
      setOpenMenu(next.label)
      setActiveIndex(-1)
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (selectable.length === 0) return
      const pos = selectable.findIndex(({ i }) => i === activeIndex)
      const next = e.key === 'ArrowDown'
        ? selectable[Math.min(pos + 1, selectable.length - 1)] ?? selectable[0]
        : selectable[Math.max(pos - 1, 0)] ?? selectable[selectable.length - 1]
      setActiveIndex(next.i)
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      const found = menu.items[activeIndex]
      if (found) runItem(found)
    }
  }

  return (
    <div className="titlebar" ref={barRef} onKeyDown={onBarKeyDown}>
      <div className="titlebar-left">
        {!minimal && (
          <nav className="menubar">
        {menus.map((menu) => (
          <div key={menu.label} className="menu">
            <button
              className={`menu-trigger ${openMenu === menu.label ? 'open' : ''}`}
              onClick={() => (openMenu === menu.label ? closeMenu() : (setOpenMenu(menu.label), setActiveIndex(-1)))}
              onMouseEnter={() => openMenu && openMenu !== menu.label && (setOpenMenu(menu.label), setActiveIndex(-1))}
            >
              {menu.label}
            </button>
            {openMenu === menu.label && (
              <div className="menu-dropdown" onMouseLeave={() => setActiveIndex(-1)}>
                {menu.items.map((item, i) =>
                  item.separator ? (
                    <div key={i} className="menu-sep" />
                  ) : (
                    <button
                      key={i}
                      className={`menu-row ${item.disabled ? 'disabled' : ''} ${activeIndex === i ? 'active' : ''}`}
                      onMouseEnter={() => setActiveIndex(item.disabled ? -1 : i)}
                      onClick={() => runItem(item)}
                    >
                      {item.icon && <item.icon size={15} />}
                      <span>{item.label}</span>
                      {item.shortcut && <span className="menu-shortcut">{item.shortcut}</span>}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        ))}
          </nav>
        )}
      </div>

      <div className="titlebar-right">
        {!minimal && userName && <span className="topbar-user">{userName}</span>}
        {!minimal && (
          <button className="btn-primary titlebar-submit" onClick={() => onSubmit?.()}>
            提交试卷
          </button>
        )}

        <div className="win-controls">
        <button className="win-btn" title="最小化" onClick={() => api.minimize()}>
          <Minus size={15} />
        </button>
        <button
          className="win-btn"
          title={maximized ? '还原' : '最大化'}
          onClick={() => api.toggleMaximize()}
        >
          {maximized ? <Copy size={13} /> : <Square size={12} />}
        </button>
        <button className="win-btn close" title="关闭" onClick={() => api.close()}>
          <X size={16} />
        </button>
        </div>
      </div>

      {/* 弹窗层 */}
      <Modal
        open={dialog === 'about'}
        title="关于 EEA Exam"
        onClose={() => setDialog(null)}
        footer={
          <button className="btn-primary modal-ok" onClick={() => setDialog(null)}>
            知道了
          </button>
        }
      >
        <div className="about-hero">
          <img src={logoUrl} alt="EEA Exam" className="about-logo logo-img" />
          <div className="about-name">EEA Exam</div>
          <span className="about-version">v0.1.0</span>
        </div>
        <p className="modal-p about-desc">
          西藏大学电子爱好者协会内部考试与测评平台，面向信息文化节等活动的程序设计类竞赛，提供在线作答、自动判分与 AI 辅导。
        </p>
        <div className="about-divider" />
        <p className="modal-p muted about-copy">
          © 2026 西藏大学电子爱好者协会 · 开放实验室
        </p>
      </Modal>

      <Modal
        open={dialog === 'rules'}
        title="考试规则说明"
        width={540}
        onClose={() => setDialog(null)}
        footer={
          <button className="btn-primary modal-ok" onClick={() => setDialog(null)}>
            我已阅读
          </button>
        }
      >
        <p className="modal-p strong">试卷结构</p>
        <p className="modal-p">共 10 题，每题 10 分，满分 100 分；不限时，完成提交即可。</p>
        <p className="modal-p strong">提交规范</p>
        <p className="modal-p">
          所有题目从 stdin 读入、向 stdout 输出；Java 入口类须为 Main；UTF-8 编码。编辑器初始为空，按规范从零编写。
        </p>
        <p className="modal-p strong">判分规则</p>
        <p className="modal-p">
          最终成绩以老师评阅为准，提交后请等待公布。
        </p>
        <p className="modal-p strong">AI 助手</p>
        <p className="modal-p">
          允许向 AI 助手追问题意、思路与调试建议，但 AI 不会运行代码，也不会直接给出完整答案；答案代码需独立完成。
        </p>
        <p className="modal-p strong">诚信约定</p>
        <p className="modal-p">考试期间请勿退出全屏或切换至其他应用窗口。</p>
      </Modal>
    </div>
  )
}
