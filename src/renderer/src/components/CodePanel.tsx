import * as monaco from 'monaco-editor'
import Editor, { loader } from '@monaco-editor/react'
import editorWorker from 'monaco-editor/editor/editor.worker?worker'
import tsWorker from 'monaco-editor/language/typescript/ts.worker?worker'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CaseSensitive,
  ChevronDown,
  ChevronUp,
  ChevronsDownUp,
  ChevronsUpDown,
  Replace,
  ReplaceAll,
  RotateCcw,
  X
} from 'lucide-react'
import { LANGUAGE_LABEL, type Language } from '../data/exam'
import Modal from './Modal'

// 使用本地打包的 monaco，禁止 @monaco-editor/react 默认走 CDN
loader.config({ monaco })

;(self as unknown as { MonacoEnvironment?: monaco.Environment }).MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker()
    }
    return new editorWorker()
  }
}

// 与整体 UI 配色一致的浅色/暗色双主题
monaco.editor.defineTheme('eea-light', {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '9aa1ab', fontStyle: 'italic' },
    { token: 'keyword', foreground: '5a6acf' },
    { token: 'string', foreground: '2e9e6b' },
    { token: 'number', foreground: 'c7841d' },
    { token: 'type', foreground: '3f74c9' }
  ],
  colors: {
    'editor.background': '#ffffff',
    'editor.lineHighlightBackground': '#f6f7fa',
    'editorLineNumber.foreground': '#c2c7cf',
    'editorLineNumber.activeForeground': '#646b76',
    'editor.selectionBackground': '#eef0fb',
    'editorCursor.foreground': '#5a6acf',
    'editorIndentGuide.background1': '#eef0f3'
  }
})

monaco.editor.defineTheme('eea-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6e7580', fontStyle: 'italic' },
    { token: 'keyword', foreground: '8291f2' },
    { token: 'string', foreground: '4ec98c' },
    { token: 'number', foreground: 'e3a955' },
    { token: 'type', foreground: '6ba3e8' }
  ],
  colors: {
    'editor.background': '#1d1f24',
    'editor.lineHighlightBackground': '#24262d',
    'editorLineNumber.foreground': '#4b5058',
    'editorLineNumber.activeForeground': '#a6acb6',
    'editor.selectionBackground': '#2a2f4a',
    'editorCursor.foreground': '#8291f2',
    'editorIndentGuide.background1': '#2b2e35'
  }
})

/** 跟随系统的暗色模式状态 */
function usePrefersDark(): boolean {
  const [isDark, setIsDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent): void => setIsDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isDark
}

interface Props {
  code: string
  language: Language
  /** 当前题目+语言的初始内容（重置用，当前为空） */
  starter: string
  onChange: (code: string) => void
  readOnly?: boolean
}

export default function CodePanel({
  code,
  language,
  starter,
  onChange,
  readOnly = false
}: Props) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const isDark = usePrefersDark()
  const [resetOpen, setResetOpen] = useState(false)
  const matchDecosRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null)
  const findInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)

  const [findOpen, setFindOpen] = useState(false)
  const [replaceOpen, setReplaceOpen] = useState(false)
  const [replaceText, setReplaceText] = useState('')
  const [query, setQuery] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [matchCount, setMatchCount] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(-1)
  const matchesRef = useRef<monaco.Range[]>([])

  const clearFind = useCallback(() => {
    matchDecosRef.current?.clear()
    matchDecosRef.current = null
    matchesRef.current = []
    setMatchCount(0)
    setCurrentIndex(-1)
  }, [])

  // 打开/关闭查找栏（withReplace: 是否展开替换行，Ctrl+H 场景）
  const openFind = useCallback((withReplace = false) => {
    setFindOpen(true)
    setReplaceOpen(withReplace)
    requestAnimationFrame(() => {
      findInputRef.current?.focus()
      findInputRef.current?.select()
    })
  }, [])

  const closeFind = useCallback(() => {
    setFindOpen(false)
    clearFind()
    editorRef.current?.focus()
  }, [clearFind])

  // 替换当前匹配；替换后代码变化会自动触发重新搜索
  const replaceCurrent = useCallback(() => {
    const editor = editorRef.current
    const match = matchesRef.current[currentIndex]
    if (!editor || !match) return
    editor.executeEdits('eea-find-replace', [{ range: match, text: replaceText }])
  }, [replaceText, currentIndex])

  // 全部替换：一次事务提交所有编辑，范围来自同一快照
  const replaceAll = useCallback(() => {
    const editor = editorRef.current
    const matches = matchesRef.current
    if (!editor || matches.length === 0) return
    editor.executeEdits(
      'eea-replace-all',
      matches.map((range) => ({ range, text: replaceText }))
    )
  }, [replaceText])

  // 定位到第 i 个匹配：选中并滚动到视口中央
  const goToMatch = useCallback((index: number) => {
    const editor = editorRef.current
    const matches = matchesRef.current
    if (!editor || matches.length === 0) return
    const next = ((index % matches.length) + matches.length) % matches.length
    setCurrentIndex(next)
    editor.setSelection(matches[next])
    editor.revealRangeInCenter(matches[next])
  }, [])

  // 执行搜索并批量高亮
  const runSearch = useCallback(
    (fromCursor: boolean) => {
      const editor = editorRef.current
      const model = editor?.getModel()
      if (!editor || !model) return
      if (!query || !findOpen) {
        clearFind()
        return
      }
      const found = model
        .findMatches(query, false, false, caseSensitive, null, false, 10000)
        .map((m) => m.range)
      matchesRef.current = found
      setMatchCount(found.length)

      if (!matchDecosRef.current) {
        matchDecosRef.current = editor.createDecorationsCollection()
      }
      matchDecosRef.current.set(
        found.map((range) => ({
          range,
          options: { className: 'eea-find-match', stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges }
        }))
      )

      if (found.length === 0) {
        setCurrentIndex(-1)
        return
      }
      // 新搜索时从光标位置就近开始
      let start = 0
      if (fromCursor) {
        const pos = editor.getPosition()
        start = found.findIndex(
          (r) => r.startLineNumber > (pos?.lineNumber ?? 0) ||
            (r.startLineNumber === (pos?.lineNumber ?? 0) && r.startColumn >= (pos?.column ?? 0))
        )
        if (start === -1) start = 0
      } else {
        start = currentIndex >= 0 ? Math.min(currentIndex, found.length - 1) : 0
      }
      goToMatch(start)
    },
    [query, caseSensitive, findOpen, currentIndex, clearFind, goToMatch]
  )

  // 搜索条件 / 代码变化时重新搜索
  useEffect(() => {
    if (!findOpen) return
    runSearch(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, caseSensitive, code, findOpen])

  // 查找栏打开期间，无论焦点在哪都响应 Ctrl+F / Ctrl+H（编辑器聚焦时由 addAction 处理，这里捕获阶段拦截避免重复）
  useEffect(() => {
    if (!findOpen) return
    const onKey = (e: KeyboardEvent): void => {
      if (!e.ctrlKey) return
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        e.stopPropagation()
        setReplaceOpen(false)
        findInputRef.current?.focus()
        findInputRef.current?.select()
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault()
        e.stopPropagation()
        setReplaceOpen(true)
        replaceInputRef.current?.focus()
        replaceInputRef.current?.select()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [findOpen])

  // 打开查找栏时全局 Esc 关闭（编辑器聚焦时也能生效）
  useEffect(() => {
    if (!findOpen) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeFind()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [findOpen, closeFind])

  return (
    <>
      <div className="code-toolbar">
        {/* 语言徽标：第二屏绑定的考试语言 */}
        <span className="lang-badge" title="本次考试绑定语言">
          {LANGUAGE_LABEL[language]}
        </span>
        <button
          className="btn-ghost reset-btn"
          onClick={() => setResetOpen(true)}
          disabled={readOnly || code === starter}
          title="清空编辑器"
        >
          <RotateCcw size={13} />
          <span>重置</span>
        </button>
      </div>

      <Modal
        open={resetOpen}
          title="清空代码"
        width={440}
        onClose={() => setResetOpen(false)}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setResetOpen(false)}>
              取消
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                onChange(starter)
                setResetOpen(false)
              }}
            >
              确认重置
            </button>
          </>
        }
      >
        <p className="modal-p">
          确定要清空当前{LANGUAGE_LABEL[language]}代码吗？已编写的内容将被删除。
        </p>
      </Modal>

      <div className="editor-wrap">
        <Editor
          language={language}
          theme={isDark ? 'eea-dark' : 'eea-light'}
          value={code}
          onChange={(v) => onChange(v ?? '')}
          onMount={(editor) => {
            editorRef.current = editor
            // 接管 Ctrl+F：隐藏 Monaco 自带查找组件，使用自研查找栏
            editor.addAction({
              id: 'eea-custom-find',
              label: '查找（EEA）',
              keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF],
              contextMenuGroupId: 'navigation',
              run: () => openFind()
            })
            // Ctrl+H 打开带替换行的自研查找栏，避免弹出原生替换组件
            editor.addAction({
              id: 'eea-custom-find-h',
              label: '替换（EEA）',
              keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH],
              run: () => openFind(true)
            })
          }}
          options={{
            fontSize: 13.5,
            fontFamily:
              '"Cascadia Code", "JetBrains Mono", Consolas, "Courier New", monospace',
            fontLigatures: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorSmoothCaretAnimation: 'on',
            padding: { top: 14, bottom: 14 },
            renderLineHighlight: 'line',
            roundedSelection: true,
            automaticLayout: true,
            tabSize: 2,
            lineNumbersMinChars: 3,
            readOnly,
            domReadOnly: readOnly,
            scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 }
          }}
        />

        {findOpen && (
          <div className="findbar">
            <div className="findbar-row">
              <input
                ref={findInputRef}
                className="findbar-input"
                placeholder="查找…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    goToMatch(currentIndex + (e.shiftKey ? -1 : 1))
                  }
                }}
              />
              <span className={`findbar-count ${query && matchCount === 0 ? 'empty' : ''}`}>
                {!query ? '' : matchCount === 0 ? '无结果' : `${currentIndex + 1}/${matchCount}`}
              </span>
              <button
                className={`findbar-btn ${caseSensitive ? 'on' : ''}`}
                title="区分大小写"
                onClick={() => setCaseSensitive((v) => !v)}
              >
                <CaseSensitive size={15} />
              </button>
              <button
                className="findbar-btn"
                title="上一个 (Shift+Enter)"
                onClick={() => goToMatch(currentIndex - 1)}
                disabled={matchCount === 0}
              >
                <ChevronUp size={15} />
              </button>
              <button
                className="findbar-btn"
                title="下一个 (Enter)"
                onClick={() => goToMatch(currentIndex + 1)}
                disabled={matchCount === 0}
              >
                <ChevronDown size={15} />
              </button>
              <button
                className={`findbar-btn ${replaceOpen ? 'on' : ''}`}
                title={replaceOpen ? '收起替换' : '展开替换'}
                onClick={() => {
                  setReplaceOpen((v) => {
                    if (!v) {
                      requestAnimationFrame(() => replaceInputRef.current?.focus())
                    }
                    return !v
                  })
                }}
              >
                {replaceOpen ? <ChevronsDownUp size={15} /> : <ChevronsUpDown size={15} />}
              </button>
              <button className="findbar-btn" title="关闭 (Esc)" onClick={closeFind}>
                <X size={14} />
              </button>
            </div>

            {replaceOpen && (
              <div className="findbar-row">
                <input
                  ref={replaceInputRef}
                  className="findbar-input"
                  placeholder="替换为…"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      replaceCurrent()
                    }
                  }}
                />
                <span className="findbar-count" />
                <button
                  className="findbar-btn"
                  title="替换 (Enter)"
                  onClick={replaceCurrent}
                  disabled={matchCount === 0 || currentIndex < 0}
                >
                  <Replace size={14} />
                </button>
                <button
                  className="findbar-btn"
                  title="全部替换"
                  onClick={replaceAll}
                  disabled={matchCount === 0}
                >
                  <ReplaceAll size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
