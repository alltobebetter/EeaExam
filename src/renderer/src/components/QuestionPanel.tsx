import type { Difficulty, Question } from '../data/exam'

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '较难'
}

interface Props {
  questions: Question[]
  activeId: string
  answeredIds: Set<string>
  onSelect: (id: string) => void
}

export default function QuestionPanel({ questions, activeId, answeredIds, onSelect }: Props) {
  const q = questions.find((item) => item.id === activeId) ?? questions[0]

  return (
    <>
      <div className="panel-body">
        <div className="q-nav">
          {questions.map((item, i) => {
            const done = answeredIds.has(item.id)
            return (
              <button
                key={item.id}
                className={['q-nav-item', item.id === activeId ? 'active' : '', done ? 'done' : ''].join(' ')}
                title={done ? `已作答 · ${item.title}` : item.title}
                onClick={() => onSelect(item.id)}
              >
                <span className="q-num">{i + 1}</span>
              </button>
            )
          })}
        </div>

        <div className="q-title">
          {questions.indexOf(q) + 1}. {q.title}
        </div>

        <div className="q-tags">
          <span className={`tag ${q.difficulty}`}>{DIFFICULTY_LABEL[q.difficulty]}</span>
          <span className="tag">{q.score} 分</span>
          <span className="tag">限制 {q.timeLimit}</span>
        </div>

        <div className="q-section">题目描述</div>
        <div className="md">
          {q.description.split('\n\n').map((para, i) => (
            <p key={i}>{renderInline(para)}</p>
          ))}
        </div>

        <div className="q-section">输入 / 输出示例</div>
        <div className="submit-spec">从 stdin 读入，向 stdout 输出；Java 入口类须为 Main</div>
        {q.samples.map((s, i) => (
          <div key={i} className="io-card">
            <div className="io-label">示例 {i + 1} · 输入</div>
            <div className="io-code">{s.input}</div>
            <div className="io-label" style={{ marginTop: 6 }}>
              输出
            </div>
            <div className="io-code">{s.output}</div>
          </div>
        ))}
      </div>

    </>
  )
}

/** 把 `code` 与 **bold** 渲染为行内元素（轻量实现，不引入完整解析器） */
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean)
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>
    return part
  })
}
