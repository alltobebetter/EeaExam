export type Difficulty = 'easy' | 'medium' | 'hard'

/** 考试支持的四种语言（考生第二屏选择其一，绑定后不可更改） */
export const LANGUAGES = ['python', 'java', 'c', 'cpp'] as const
export type Language = (typeof LANGUAGES)[number]

export const LANGUAGE_LABEL: Record<Language, string> = {
  python: 'Python',
  java: 'Java',
  c: 'C 语言',
  cpp: 'C++'
}

export interface Question {
  id: string
  title: string
  difficulty: Difficulty
  score: number
  timeLimit: string
  description: string
  samples: { input: string; output: string }[]
  starterCode: Record<Language, string>
}

/** 历史判题结果类型保留作兼容（不再产生新结果） */
export type { CaseResult, RunResult } from '../../../shared/types'

/**
 * 题库不再内置于客户端：登录后经 GET /api/exam/questions 下发。
 * 此处仅保留类型与语言常量，EXE 解包看不到任何题面。
 */
