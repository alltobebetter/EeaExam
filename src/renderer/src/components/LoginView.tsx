/**
 * 登录界面（两步走，第二步才真正建档）：
 * 第一步：姓名 + 学号 + 服务地址（本地校验，不发请求）；
 * 第二步：考试语言 —— 与建档同一次请求提交，一考一号，只允许首次进入，语言之后不可改。
 * 中途崩溃/重启靠本地保存的会话恢复，不走重新登录。
 */
import { useState } from 'react'
import { ArrowLeft, IdCard, UserRound } from 'lucide-react'
import { LANGUAGES, LANGUAGE_LABEL, type Language } from '../data/exam'
import type { UserInfo } from '../api/backend'
import { getConfiguredApiBaseUrl, setApiBaseUrl } from '../api/backend'
import logoUrl from '../assets/logo.svg'

interface Props {
  /** 登录建档：姓名 + 学号 + 语言一次提交；一考一号，重复登录由服务端拒绝 */
  onLogin: (
    name: string,
    studentId: string,
    language: Language
  ) => Promise<{ user?: UserInfo; error?: string; duplicate?: boolean }>
  /** 进入考试（名字由这里显式传入，避免闭包拿到登录前的旧 user） */
  onEnter: (displayName: string) => void
}

export default function LoginView({ onLogin, onEnter }: Props): React.JSX.Element {
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [language, setLanguage] = useState<Language>('python')
  // 集中部署：后端地址运行时可改，存 localStorage，下次自动记住；不预填
  const [apiBase, setApiBase] = useState(() => getConfiguredApiBaseUrl())

  /** 第一步只在本地校验并进入第二步，真正建档在第二步（语言一起提交，避免半成品账号） */
  const submitStep1 = (): void => {
    if (submitting || !name.trim() || !studentId.trim()) return
    setLanguage('python')
    setStep(2)
  }

  /** 第二步：语言 + 身份一次提交建档，成功即不可再用同一学号登录 */
  const submitStep2 = async (): Promise<void> => {
    if (submitting) return
    setSubmitting(true)
    const res = await onLogin(name.trim(), studentId.trim(), language)
    setSubmitting(false)
    if (res.error || !res.user) {
      // 已被占用（或填写有误）：退回第一步让考生核对姓名与学号
      if (res.duplicate) setStep(1)
      return
    }
    onEnter(res.user.name)
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
                onKeyDown={(e) => e.key === 'Enter' && submitStep1()}
              />
            </div>

            <button
              className="btn-primary login-submit"
              onClick={() => submitStep1()}
              disabled={!name.trim() || !studentId.trim()}
            >
              下一步
            </button>

            <label className="login-label" style={{ marginTop: 12 }}>考试服务地址</label>
            <div className="login-field">
              <input
                value={apiBase}
                placeholder="默认 http://192.168.0.141:8787"
                onChange={(e) => {
                  setApiBase(e.target.value)
                  setApiBaseUrl(e.target.value)
                }}
                onBlur={(e) => {
                  const v = e.target.value.trim().replace(/\/$/, '')
                  setApiBase(v)
                  setApiBaseUrl(v)
                }}
              />
            </div>
          </div>
        ) : (
          <div className="login-step" key="s2">
            <label className="login-label">考试语言</label>
            <div className="login-langs">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  className={`login-lang ${language === lang ? 'on' : ''}`}
                  disabled={submitting}
                  onClick={() => setLanguage(lang)}
                >
                  {LANGUAGE_LABEL[lang]}
                </button>
              ))}
            </div>

            <p className="login-note">
              {name.trim()} · {studentId.trim()}
              <br />
              进入后身份与语言均锁定，本场无法用同一学号再次登录。
            </p>

            <button
              className="btn-primary login-submit"
              onClick={() => void submitStep2()}
              disabled={submitting}
            >
              {submitting ? '进入中…' : '进入考试'}
            </button>
            <button className="login-back" onClick={() => setStep(1)} type="button" disabled={submitting}>
              <ArrowLeft size={14} />
              返回上一步
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
