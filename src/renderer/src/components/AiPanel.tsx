/**
 * AI 助手面板：对接后端 /api/ai/chat 的真实流式对话
 *
 * 聊天流结构（对齐 OpenAI inline 工具展示模式）：
 *   用户消息 → AI 文本/思考 → [工具调用行] → AI 文本续写 → ...
 * 工具调用是聊天流中的独立行，按发生时序穿插，而不是堆在消息头部。
 * 回复期间发送按钮变为停止按钮，可随时中断（保留已输出的部分）。
 */
import { useEffect, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowUp,
  BookOpen,
  Check,
  Loader2,
  Square
} from 'lucide-react'
import type { Question } from '../data/exam'
import Modal from './Modal'
import {
  apiGetTokens,
  apiStreamChat,
  apiGetChats,
  apiSaveChats,
  apiClearChats,
  type ChatItem
} from '../api/backend'

interface Props {
  token: string
  question: Question
  code: string
  userName: string
  disabled?: boolean
}

// ---------- 聊天持久化：按题目隔离存后端，登录/换机器后恢复 ----------

/** 每题最多保留的聊天条数（含思考链/工具行），防止单题记录无限膨胀 */
const MAX_ITEMS_PER_QUESTION = 60

const TOOL_LABEL: Record<string, string> = {
  get_question_detail: '读取题目详情',
  get_visible_cases: '读取示例用例',
  get_current_code: '读取当前代码',
  get_progress: '读取作答进度'
}

export default function AiPanel({ token, question, code, userName, disabled = false }: Props): React.JSX.Element {
  const [items, setItems] = useState<ChatItem[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [totalTokens, setTotalTokens] = useState(0)
  const [clearOpen, setClearOpen] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<(() => void) | null>(null)
  // 当前题目的实时引用：切换题目时用它把旧题的聊天写回后端
  const itemsRef = useRef(items)
  itemsRef.current = items
  const qidRef = useRef(question.id)
  // 已从后端加载到本地的题号；为 null 时不同步，避免加载回来的数据又原样写回去
  const loadedRef = useRef<string | null>(null)
  // 最近一次已保存快照：内容一致时跳过写入
  const savedRef = useRef('')

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [items])

  // 聊天记录变化时同步到后端（流式期间跳过，等整轮结束一次存）
  useEffect(() => {
    const qid = qidRef.current
    if (loadedRef.current !== qid) return
    if (items.length === 0) return
    if (items.some((m) => m.streaming)) return
    const snapshot = JSON.stringify(items.slice(-MAX_ITEMS_PER_QUESTION))
    if (snapshot === savedRef.current) return
    savedRef.current = snapshot
    void apiSaveChats(token, qid, items.slice(-MAX_ITEMS_PER_QUESTION))
  }, [items, token])

  // 切换题目：先把旧题聊天写回后端，再从后端加载新题的会话（每题独立，互不串味）
  useEffect(() => {
    if (qidRef.current === question.id && loadedRef.current === question.id) return
    abortRef.current?.()
    abortRef.current = null
    const prevQid = qidRef.current
    if (loadedRef.current === prevQid) {
      void apiSaveChats(token, prevQid, itemsRef.current.slice(-MAX_ITEMS_PER_QUESTION))
    }
    qidRef.current = question.id
    loadedRef.current = null
    setBusy(false)
    setItems([])
    let cancelled = false
    void apiGetChats(token, question.id).then((remote) => {
      if (cancelled) return
      loadedRef.current = question.id
      const list = remote ?? []
      savedRef.current = JSON.stringify(list)
      setItems(list)
    })
    return () => {
      cancelled = true
    }
  }, [question.id, token])

  useEffect(() => () => abortRef.current?.(), [])

  // 初始加载累计 Tokens（计划书：控制台实时查看本人用量，输入+输出合计，所有对话加总）
  useEffect(() => {
    void apiGetTokens(token).then((v) => {
      if (typeof v === 'number') setTotalTokens(v)
    })
  }, [token])

  // textarea 自动增高（上限 140px）
  const autoResize = (el: HTMLTextAreaElement): void => {
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }

  /** 更新最后一个元素 */
  const patchLast = (patch: (m: ChatItem) => ChatItem): void => {
    setItems((prev) => {
      const next = [...prev]
      next[next.length - 1] = patch(next[next.length - 1])
      return next
    })
  }

  /** 确保末尾存在一个流式中的 AI 文本元素（工具行之后会新开一个） */
  const ensureTextItem = (): void => {
    setItems((prev) => {
      const last = prev[prev.length - 1]
      if (last && last.kind === 'assistant-text' && last.streaming) return prev
      return [...prev, { kind: 'assistant-text', content: '', reasoning: '', streaming: true }]
    })
  }

  const finishAll = (): void => {
    setItems((prev) => prev.map((m) => (m.streaming ? { ...m, streaming: false } : m)))
    setBusy(false)
  }

  const stop = (): void => {
    abortRef.current?.()
    abortRef.current = null
    finishAll()
  }

  const send = (raw?: string): void => {
    if (disabled) return
    const text = (raw ?? input).trim()
    if (!text || busy) return
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setBusy(true)

    const history = items
      .filter((m) => m.kind !== 'tool' && m.content)
      .map((m) => ({ role: m.kind === 'user' ? 'user' : 'assistant', content: m.content }))

    setItems((prev) => [
      ...prev,
      { kind: 'user', content: text },
      { kind: 'assistant-text', content: '', reasoning: '', streaming: true }
    ])

    const patchCurrentText = (patch: (m: ChatItem) => ChatItem): void => {
      ensureTextItem()
      patchLast(patch)
    }

    abortRef.current = apiStreamChat(
      token,
      {
        messages: [...history, { role: 'user', content: text }],
        context: { currentQuestion: question, currentCode: code }
      },
      {
        onDelta: (t) => patchCurrentText((m) => ({ ...m, content: m.content + t })),
        onReasoning: (t) =>
          patchCurrentText((m) => ({ ...m, reasoning: (m.reasoning ?? '') + t })),
        onTokens: (total) => setTotalTokens(total),
        onToolCall: (name) => {
          // 结束当前文本段，工具调用作为独立消息行插入聊天流
          setItems((prev) => {
            const next = prev.map((m) => (m.streaming ? { ...m, streaming: false } : m))
            return [...next, { kind: 'tool', content: '', toolName: name, streaming: true }]
          })
        },
        onToolResult: (name, result) => {
          setItems((prev) => {
            const next = [...prev]
            for (let i = next.length - 1; i >= 0; i--) {
              if (next[i].kind === 'tool' && next[i].toolName === name && !next[i].toolResult) {
                next[i] = { ...next[i], toolResult: result }
                break
              }
            }
            return next
          })
        },
        onError: (message) => {
          patchCurrentText((m) => ({
            ...m,
            content: `${m.content}\n\n**[错误]** ${message}`
          }))
        },
        onDone: finishAll
      }
    )
  }

  return (
    <>
      <div className="panel-header">
        AI 助手
        <span className="spacer" />
        {items.length > 0 && (
          <button
            className="ai-clear-btn"
            title="清空聊天记录"
            onClick={() => setClearOpen(true)}
          >
            清空
          </button>
        )}
        <span className="ai-model-chip" title="输入+输出合计，所有题目对话累计">
          Tokens {totalTokens.toLocaleString()}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="ai-empty">
          <div className="ai-empty-title">你好，{userName}，有什么我可以帮助你的吗？</div>
        </div>
      ) : (
        <div className="ai-messages" ref={listRef}>
          {/* 连续的 AI 元素（思考/工具/文本）分组进同一个容器，块内用紧凑节奏，块间才有大间距 */}
          {items
            .reduce<ChatItem[][]>((groups, item) => {
              const last = groups[groups.length - 1]
              if (item.kind !== 'user' && last && last[0].kind !== 'user') {
                last.push(item)
              } else {
                groups.push([item])
              }
              return groups
            }, [])
            .map((group, gi) =>
              group[0].kind === 'user' ? (
                <div key={gi} className="msg-user">
                  <div className="bubble">{group[0].content}</div>
                </div>
              ) : (
                <div key={gi} className="msg-assistant">
                  {group.map((item, i) => {
                    if (item.kind === 'tool') {
                      return (
                        <div key={i} className="tool-row">
                          {item.toolResult !== undefined ? (
                            <Check size={12} />
                          ) : (
                            <Loader2 size={12} className="spin" />
                          )}
                          <span>
                            {item.toolResult !== undefined ? '已' : '正在'}
                            {TOOL_LABEL[item.toolName ?? ''] ?? item.toolName}
                          </span>
                        </div>
                      )
                    }

                    const empty = !item.content && !item.reasoning
                    return (
                      <div key={i}>
                        {item.reasoning && (
                          <details className="reasoning" open={!!item.streaming && !item.content}>
                            <summary>
                              <BookOpen size={11} />
                              思考过程
                            </summary>
                            <div className="reasoning-body">{item.reasoning}</div>
                          </details>
                        )}
                        {item.content ? (
                          <div className="md">
                            <Markdown remarkPlugins={[remarkGfm]}>{item.content}</Markdown>
                          </div>
                        ) : (
                          empty && (
                            <span className="typing-dot">
                              <i />
                              <i />
                              <i />
                            </span>
                          )
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            )}
        </div>
      )}

      <div className="ai-input">
        <textarea
          ref={inputRef}
          rows={1}
          placeholder={disabled ? '试卷已提交，AI 已禁用' : '输入你的问题…（Enter 发送）'}
          value={input}
          disabled={disabled}
          onChange={(e) => {
            setInput(e.target.value)
            autoResize(e.currentTarget)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <div className="ai-input-footer">
          <span className="spacer" />
          <button
            className={`send-btn ${busy ? 'stop' : ''}`}
            aria-label={busy ? '停止' : '发送'}
            title={disabled ? '试卷已提交' : busy ? '停止生成' : '发送'}
            onClick={() => (busy ? stop() : send())}
            disabled={disabled || (!busy && !input.trim())}
          >
            {busy ? <Square size={12} /> : <ArrowUp size={16} />}
          </button>
        </div>
      </div>
      <Modal
        open={clearOpen}
        title="清空聊天记录"
        width={440}
        onClose={() => setClearOpen(false)}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setClearOpen(false)}>
              取消
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                abortRef.current?.()
                abortRef.current = null
                setItems([])
                setBusy(false)
                savedRef.current = '[]'
                void apiClearChats(token, question.id)
                setClearOpen(false)
              }}
            >
              确认清空
            </button>
          </>
        }
      >
        <p className="modal-p">
          确定要清空本题的 AI 聊天记录吗？清空后服务端记录一并删除，无法恢复；Tokens 累计用量不受影响。
        </p>
      </Modal>
    </>
  )
}
