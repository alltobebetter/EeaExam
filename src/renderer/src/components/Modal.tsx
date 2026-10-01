import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  width?: number
  footer?: React.ReactNode
  children: React.ReactNode
}

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

const EXIT_MS = 170

/**
 * 通用弹窗（遵循 WAI-ARIA Dialog 模式）：
 * - Portal 到 body，role=dialog + aria-modal
 * - 打开时焦点移入，Tab/Shift+Tab 循环锁定在弹窗内
 * - Esc / 遮罩点击 / 关闭按钮均可关闭
 * - 关闭后焦点归还给打开它的元素，body 滚动锁定
 */
export default function Modal({
  open,
  title,
  onClose,
  width = 480,
  footer,
  children
}: ModalProps): React.ReactPortal | null {
  const cardRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)
  // open 变 false 后仍渲染一小段时间，播放关闭动画后再卸载
  const [render, setRender] = useState(open)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (open) {
      setRender(true)
      setClosing(false)
      return
    }
    if (!render) return
    setClosing(true)
    const timer = window.setTimeout(() => {
      setRender(false)
      setClosing(false)
    }, EXIT_MS)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    restoreRef.current = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'

    const getFocusables = (): HTMLElement[] =>
      Array.from(cardRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])

    // 初始焦点：优先聚焦弹窗卡片本身，避免误触操作按钮
    requestAnimationFrame(() => cardRef.current?.focus())

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key === 'Tab') {
        const els = getFocusables()
        if (els.length === 0) return
        const first = els[0]
        const last = els[els.length - 1]
        const active = document.activeElement
        if (e.shiftKey && (active === first || !cardRef.current?.contains(active))) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && (active === last || !cardRef.current?.contains(active))) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    // 捕获阶段监听，优先于菜单等其他快捷键处理
    document.addEventListener('keydown', onKey, true)

    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey, true)
      restoreRef.current?.focus()
    }
  }, [open, onClose])

  if (!render) return null

  return createPortal(
    <div className={`modal-overlay ${closing ? 'closing' : ''}`}>
      <div
        className={`modal ${closing ? 'closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ width }}
        ref={cardRef}
        tabIndex={-1}
      >
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" aria-label="关闭" onClick={onClose}>
            <X size={15} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}
