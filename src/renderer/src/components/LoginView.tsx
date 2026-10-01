/**
 * 登录界面（两步走）：
 * 第一步：姓名 + 学号，只验名册身份；
 * 第二步：考试语言（首登可选，入库后锁定不可改）。
 */
import { useState } from 'react'
import { ArrowLeft, IdCard, UserRound } from 'lucide-react'
import { LANGUAGES, LANGUAGE_LABEL, type Language } from '../data/exam'
import type { UserInfo } from '../api/backend'
import { getApiBaseUrl, setApiBaseUrl } from '../api/backend'
import logoUrl from '../assets/logo.svg'

interface Props {
  /** 第一步：验身份。成功时 App 已完成 setUser/恢复状态，返回 user；失败返回 error（已弹 Toast） */
  onLogin: (name: string, studentId: string) => Promise<{ user?: UserInfo; error?: string }>
  /** 第二步：语言一次性绑定（已锁定时不调用） */
  onBindLanguage: (lang: Language) => Promise<string | null>
  /** 进入考试（名字由这里显式传入，避免闭包拿到登录前的旧 user） */
  onEnter: (displayName: string) => void
}

export default function LoginView({ onLogin, onBindLanguage, onEnter }: Props): React.JSX.Element {
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [language, setLanguage] = useState<Language>('python')
  const [languageLocked, setLanguageLocked] = useState(false)
  const [binding, setBinding] = useState(false)
  // 集中部署：后端地址运行时可改（默认本机），存 localStorage，下次自动记住
  const [apiBase, setApiBase] = useState(() => getApiBaseUrl())

  const submitStep1 = async (): Promise<void> => {
    if (submitting || !name.trim() || !studentId.trim()) return
    setSubmitting(true)
    const res = await onLogin(name.trim(), studentId.trim())
    setSubmitting(false)
    if (res.error || !res.user) return
    // 已绑定语言 → 直接进；否则进第二屏选语言
    if (res.user.language) {
      onEnter(res.user.name)
      return
    }
    setLanguage('python')
    setLanguageLocked(false)
    setStep(2)
  }

  const submitStep2 = async (): Promise<void> => {
    if (binding) return
    setBinding(true)
    const err = await onBindLanguage(language)
    if (err) {
      setBinding(false)
      return
    }
    onEnter(name.trim())
    setBinding(false)
  }

  return (
    <div className="login-view">
      <div className="login-card">
        <div className="login-brand">
          <img src={logoUrl} alt="EEA Exam" className="login-logo" />
          <div>
            <div className="login-title">EEA Exam</div>
            <div className="login-sub">程序设计在线测评</div>
          </div>
        </div>

        {step === 1 ? (
          <div className="login-step" key="s1">
            <label className="login-label">姓名</label>
            <div className="login-field">
              <UserRound size={15} />
              <input
                value={name}
                placeholder="请输入姓名"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void submitStep1()}
              />
            </div>

            <label className="login-label">学号</label>
            <div className="login-field">
              <IdCard size={15} />
              <input
                value={studentId}
                placeholder="请输入学号"
                onChange={(e) => setStudentId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void submitStep1()}
              />
            </div>

            <button
              className="btn-primary login-submit"
              onClick={() => void submitStep1()}
              disabled={submitting || !name.trim() || !studentId.trim()}
            >
              {submitting ? '验证中…' : '下一步'}
            </button>

            <label className="login-label" style={{ marginTop: 12 }}>考试服务地址</label>
            <div className="login-field">
              <input
                value={apiBase}
                placeholder="http://服务器IP:8787"
                onChange={(e) => {
                  setApiBase(e.target.value)
                  setApiBaseUrl(e.target.value)
                }}
                onBlur={(e) => {
                  const v = e.target.value.trim().replace(/\/$/, '') || getApiBaseUrl()
                  setApiBase(v)
                  setApiBaseUrl(v)
                }}
              />
            </div>
          </div>
        ) : (
          <div className="login-step" key="s2">
            <label className="login-label">考试语言（首次选择，提交后不可更改）</label>
            <div className="login-langs">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  className={`login-lang ${language === lang ? 'on' : ''}`}
                  disabled={languageLocked}
                  onClick={() => setLanguage(lang)}
                >
                  {LANGUAGE_LABEL[lang]}
                </button>
              ))}
            </div>

            <button
              className="btn-primary login-submit"
              onClick={() => void submitStep2()}
              disabled={binding}
            >
              {binding ? '确认中…' : '进入考试'}
            </button>
            <button className="login-back" onClick={() => setStep(1)} type="button">
              <ArrowLeft size={14} />
              返回上一步
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
