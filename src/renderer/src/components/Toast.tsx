/**
 * 轻量 Toast 通知（Android 风格）：
 * - 底部居中展示
 * - 同一内容重复触发时复用现有实例并重置消失计时（Android 11+ 文本 Toast 去重行为），不会叠一摞
 * - 不同内容最多同时显示 3 条
 */
import { useEffect, useRef, useState } from 'react'
import { CircleCheck, CircleX, Info } from 'lucide-react'

type ToastType = 'error' | 'success' | 'info'

interface ToastItem {
  id: number
  type: ToastType
  text: string
  /** 进入退场动画阶段，到期后从 DOM 移除 */
  leaving?: boolean
}

let listener: ((t: Omit<ToastItem, 'id'>) => void) | null = null
let seq = 0

const TOAST_DURATION_MS = 3200
// 退场动画时长，需与 CSS 中 toast-out 动画一致
const TOAST_EXIT_MS = 180

export function toast(type: ToastType, text: string): void {
  listener?.({ type, text })
}

const ICONS: Record<ToastType, React.ComponentType<{ size?: number }>> = {
  error: CircleX,
  success: CircleCheck,
  info: Info
}

export function Toaster(): React.JSX.Element {
  const [items, setItems] = useState<ToastItem[]>([])
  const timersRef = useRef(new Map<number, number>())

  useEffect(() => {
    const schedule = (id: number): void => {
      const timer = window.setTimeout(() => {
        // 先标记退场（播放 toast-out 动画），动画结束后再真正移除
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, leaving: true } : item))
        )
        const remove = window.setTimeout(() => {
          setItems((prev) => prev.filter((item) => item.id !== id))
          timersRef.current.delete(id)
        }, TOAST_EXIT_MS)
        timersRef.current.set(id, remove)
      }, TOAST_DURATION_MS)
      timersRef.current.set(id, timer)
    }

    listener = (t) => {
      setItems((prev) => {
        // 重复内容：复用现有实例，仅重置消失计时
        const idx = prev.findIndex((item) => item.type === t.type && item.text === t.text)
        if (idx !== -1) {
          const existingId = prev[idx].id
          const old = timersRef.current.get(existingId)
          if (old) clearTimeout(old)
          schedule(existingId)
          return prev.map((item, i) =>
            i === idx ? { ...item, leaving: false } : item
          )
        }
        // 新内容：入队，超出 3 条时移除最旧的
        const id = ++seq
        const next = [...prev, { id, ...t }]
        const overflow = next.length > 3 ? next.slice(0, next.length - 3) : []
        schedule(id)
        for (const item of overflow) {
          const old = timersRef.current.get(item.id)
          if (old) clearTimeout(old)
          timersRef.current.delete(item.id)
        }
        return next.slice(-3)
      })
    }

    return () => {
      listener = null
      timersRef.current.forEach((timer) => window.clearTimeout(timer))
      timersRef.current.clear()
    }
  }, [])

  if (items.length === 0) return <div />

  return (
    <div className="toaster">
      {items.map((item) => {
        const Icon = ICONS[item.type]
        return (
          <div
            key={item.id}
            className={`toast toast-${item.type} ${item.leaving ? 'toast-leaving' : ''}`}
          >
            <Icon size={15} />
            <span>{item.text}</span>
          </div>
        )
      })}
    </div>
  )
}
