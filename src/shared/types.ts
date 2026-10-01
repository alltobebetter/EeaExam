/** 共享类型：作答与AI聊天相关 */
export interface TestCase {
  stdin: string
  expected: string
  hidden?: boolean
}

export interface CaseResult {
  index: number
  passed: boolean
  timeMs: number
  hidden: boolean
  stderrHead: string
  input: string
  expected: string
  actual: string
}

export interface JudgeResult {
  passed: boolean
  caseResults: CaseResult[]
  stderrHead: string
}

/** 兼容渲染层的别名：RunResult 即 JudgeResult */
export type RunResult = JudgeResult

export type Language = 'python' | 'java' | 'c' | 'cpp'
