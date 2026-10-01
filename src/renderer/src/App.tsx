import { useEffect, useMemo, useRef, useState } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import QuestionPanel from './components/QuestionPanel'
import CodePanel from './components/CodePanel'
import AiPanel from './components/AiPanel'
import TitleBar from './components/TitleBar'
import LoginView from './components/LoginView'
import Modal from './components/Modal'
import { Toaster, toast } from './components/Toast'
import {
  apiLogin,
  apiBindLanguage,
  apiSaveDraft,
  apiGetState,
  apiSetActiveQuestion,
  apiSubmitExam,
  apiGetQuestions,
  type UserInfo
} from './api/backend'
import { type Language, type Question } from './data/exam'

export default function App(): React.JSX.Element {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [token, setToken] = useState('')
  // 题库服务端下发（登录后拉取，EXE 内零题面）
  const [questions, setQuestions] = useState<Question[]>([])
  // 当前题目存后端：登录时恢复，换题即同步（换机器/刷新不丢）
  const [activeId, setActiveId] = useState('')
  // 每题按语言独立保存代码，切换语言/题目互不覆盖
  const [codes, setCodes] = useState<Record<string, Record<Language, string>>>(() => ({}))

  // 登录两步走：user 有值只代表身份已验，entered 才代表语言确认完毕可进考试
  const [entered, setEntered] = useState(false)

  // 提交相关（不限时模式：仅手动交卷锁卷）
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ answeredCount: number; submittedAt: string } | null>(null)
  const [examLocked, setExamLocked] = useState(false)
  const submittingRef = useRef(false)

  // 第二屏一次性绑定的考试语言（入库后不可更改）
  const language = (user?.language ?? 'python') as Language

  const activeQuestion = useMemo(
    () => questions.find((q) => q.id === activeId) ?? questions[0] ?? null,
    [questions, activeId]
  )

  // 已作答 = 代码与初始模板不同且非空（无判题，仅供导航绿点与交卷计数）
  const answeredIds = useMemo(() => {
    const s = new Set<string>()
    for (const q of questions) {
      const c = codes[q.id]?.[language] ?? ''
      if (c.trim().length > 0 && c !== q.starterCode[language]) s.add(q.id)
    }
    return s
  }, [codes, language, questions])

  const handleLogout = (): void => {
    setToken('')
    setUser(null)
    setEntered(false)
    setExamLocked(false)
    setSubmitResult(null)
    setSubmitConfirmOpen(false)
    setQuestions([])
    setActiveId('')
    setCodes({})
    submittingRef.current = false
  }

  /** 第一步：验身份（名册），成功后拉题库并恢复考生状态；语言第二屏确认 */
  const handleLogin = async (
    name: string,
    studentId: string
  ): Promise<{ user?: UserInfo; error?: string }> => {
    const res = await apiLogin(name, studentId)
    if (!res.ok || !res.user || !res.token) {
      toast('error', res.error ?? '登录失败')
      return { error: res.error ?? '登录失败' }
    }
    // 题库下发（鉴权后可见；失败则不进考试，提示重试）
    const qs = await apiGetQuestions(res.token)
    if (!qs || qs.length === 0) {
      toast('error', '题库加载失败，请确认考试服务正常后重试')
      return { error: '题库加载失败，请确认考试服务正常后重试' }
    }
    setToken(res.token)
    setUser(res.user)
    setQuestions(qs as Question[])
    // 新会话重置收卷状态
    setExamLocked(false)
    setSubmitResult(null)
    submittingRef.current = false

    // 初始化代码（服务端题面自带初始模板）与当前题号
    const initCodes: Record<string, Record<Language, string>> = Object.fromEntries(
      qs.map((q) => [q.id, { ...(q.starterCode as Record<Language, string>) }])
    )
    let firstId = qs[0].id

    // 恢复考生状态：历史草稿 + 当前题号 + 是否已交卷（草稿/题号/聊天全在后端）
    const state = await apiGetState(res.token)
    let alreadySubmitted = false
    if (state) {
      for (const [qid, langs] of Object.entries(state.drafts ?? {})) {
        if (!initCodes[qid]) continue
        initCodes[qid] = { ...initCodes[qid], ...langs } as Record<Language, string>
      }
      if (state.activeQuestion && qs.some((q) => q.id === state.activeQuestion)) {
        firstId = state.activeQuestion
      }
      if (state.submission) {
        alreadySubmitted = true
        setExamLocked(true)
        setSubmitResult({
          answeredCount: state.submission.solvedCount ?? 0,
          submittedAt: state.submission.submittedAt
        })
      }
    }
    setCodes(initCodes)
    setActiveId(firstId)
    if (alreadySubmitted) toast('info', '该账号已交卷，试卷为只读状态')

    return { user: res.user }
  }

  /** 第二步：语言一次性绑定（已锁定时 LoginView 不会调用） */
  const handleBindLanguage = async (lang: Language): Promise<string | null> => {
    if (!token) return '登录已过期，请重新登录'
    const res = await apiBindLanguage(token, lang)
    if (!res.ok || !res.user) {
      toast('error', res.error ?? '绑定语言失败')
      return res.error ?? '绑定语言失败'
    }
    setUser(res.user)
    return null
  }

  /** 第二步：确认考试语言并进入考试（名字由 LoginView 显式传入，避免闭包拿到登录前的旧 user） */
  const handleEnter = (displayName: string): void => {
    setEntered(true)
    if (!examLocked) toast('success', `欢迎，${displayName}，考试开始！`)
  }

  const selectQuestion = (id: string): void => {
    setActiveId(id)
    // 换题即同步到后端（登录态下）；失败静默，下次切题/登录时以最后一次成功为准
    if (token) void apiSetActiveQuestion(token, id)
  }

  const handleRequestSubmit = (): void => {
    if (examLocked || submittingRef.current) return
    setSubmitConfirmOpen(true)
  }

  const handleConfirmSubmit = async (): Promise<void> => {
    if (submittingRef.current || !token) return
    submittingRef.current = true
    const res = await apiSubmitExam(token)
    // 交卷失败（网络/服务端异常）时不锁卷，留在确认框让考生重试
    if (!res) {
      toast('error', '交卷失败，请确认考试服务正常后重试')
      submittingRef.current = false
      return
    }
    setExamLocked(true)
    setSubmitConfirmOpen(false)
    setSubmitResult({ answeredCount: res.solvedCount ?? 0, submittedAt: new Date().toISOString() })
    toast('success', `已交卷 · 作答 ${res.solvedCount ?? 0}/${questions.length} 题`)
    submittingRef.current = false
  }

  // 代码草稿实时自动保存（800ms 防抖，收卷后停止）
  useEffect(() => {
    if (!user || !token || examLocked || !activeId) return
    const timer = window.setTimeout(() => {
      void apiSaveDraft(token, {
        questionId: activeId,
        language,
        code: codes[activeId]?.[language] ?? ''
      })
    }, 800)
    return () => window.clearTimeout(timer)
  }, [codes, activeId, language, user, token, examLocked])

  // 未登录 / 未确认考试环境：标题栏（窗口控制）+ 登录界面（两步走）
  if (!user || !entered) {
    return (
      <div className="app-shell">
        <TitleBar minimal />
        <LoginView
          onLogin={handleLogin}
          onBindLanguage={handleBindLanguage}
          onEnter={handleEnter}
        />
        <Toaster />
      </div>
    )
  }

  // 题库加载中（正常流程 handleLogin 成功后才进考试，此为兜底）
  if (!activeQuestion) {
    return (
      <div className="app-shell">
        <TitleBar minimal />
        <div className="login-view">
          <div className="login-card">
            <p className="modal-p">题库加载中…如长时间停留请返回登录重试。</p>
            <button className="btn-primary login-submit" onClick={handleLogout}>
              返回登录
            </button>
          </div>
        </div>
        <Toaster />
      </div>
    )
  }

  return (
    <div className="app-shell">
      {/* 自定义标题栏：菜单 + 交卷 + 窗口控制，全部归到一行 */}
        <TitleBar
          userName={user.name}
          onSubmit={handleRequestSubmit}
        />

      <div className="workbench">
        <Group
          orientation="horizontal"
          id="eea-exam-layout"
          defaultLayout={{ q: 26, code: 48, ai: 26 }}
          style={{ height: '100%', display: 'flex' }}
        >
          <Panel id="q" defaultSize="28" minSize="18" maxSize="45">
            <section className="panel">
              <QuestionPanel questions={questions} activeId={activeId} answeredIds={answeredIds} onSelect={selectQuestion} />
            </section>
          </Panel>

          <Separator className="panel-handle" />

          <Panel id="code" defaultSize="48" minSize="25">
            <section className="panel">
              <CodePanel
                code={codes[activeId]?.[language] ?? ''}
                language={language}
                starter={activeQuestion.starterCode[language] ?? ''}
                onChange={(code) => {
                  if (examLocked) return
                  setCodes((prev) => ({
                    ...prev,
                    [activeId]: { ...prev[activeId], [language]: code }
                  }))
                }}
                readOnly={examLocked}
              />
            </section>
          </Panel>

          <Separator className="panel-handle" />

          <Panel id="ai" defaultSize="26" minSize="18" maxSize="45">
            <section className="panel">
              <AiPanel
                token={token}
                question={activeQuestion}
                code={codes[activeId]?.[language] ?? ''}
                userName={user.name}
                disabled={examLocked}
              />
            </section>
          </Panel>
        </Group>
      </div>

      <Toaster />

      {/* 交卷二次确认 */}
      <Modal
        open={submitConfirmOpen}
        title="确认提交试卷？"
        width={480}
        onClose={() => setSubmitConfirmOpen(false)}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setSubmitConfirmOpen(false)}>
              继续作答
            </button>
            <button className="btn-primary" onClick={() => void handleConfirmSubmit()}>
              确认提交
            </button>
          </>
        }
      >
        <p className="modal-p">
          已作答 <strong>{answeredIds.size}</strong> / {questions.length} 题，
          未作答 {questions.length - answeredIds.size} 题。
        </p>
        <p className="modal-p muted">提交后将锁定试卷，无法继续作答。请确认已完成作答。</p>
      </Modal>

      {/* 已交卷结果 */}
      <Modal
        open={!!submitResult}
        title="已提交试卷"
        width={480}
        onClose={() => {}}
        footer={
          <button className="btn-primary modal-ok" onClick={handleLogout}>
            返回登录
          </button>
        }
      >
        <p className="modal-p">
          交卷成功。本次作答 <strong>{submitResult?.answeredCount ?? 0}</strong> / {questions.length} 题。
        </p>
        <p className="modal-p muted">
          试卷已锁定，代码编辑已禁用。如需换人考试，请返回登录后使用新学号登录。
        </p>
      </Modal>
    </div>
  )
}
