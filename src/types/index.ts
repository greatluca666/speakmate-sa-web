export type UserLevel = 'beginner' | 'intermediate' | 'fluent'

export const LEVEL_DISPLAY: Record<UserLevel, string> = {
  beginner: '入门',
  intermediate: '进阶',
  fluent: '流利'
}

export type TranslationMode = 'always' | 'newWordsOnly' | 'never'

export function levelTranslationMode(level: UserLevel): TranslationMode {
  if (level === 'beginner') return 'always'
  if (level === 'intermediate') return 'newWordsOnly'
  return 'never'
}

export type CorrectionType =
  | 'grammar'
  | 'vocabulary'
  | 'article'
  | 'preposition'
  | 'tense'
  | 'pronunciation'
  | 'other'

export type ScenarioCategory = 'daily' | 'services' | 'social' | 'free'

export const CATEGORY_DISPLAY: Record<ScenarioCategory, string> = {
  daily: '日常生活',
  services: '办事服务',
  social: '社交',
  free: '自由对话'
}

export interface Scenario {
  id: string
  titleZh: string
  descriptionZh: string
  category: ScenarioCategory
  level: UserLevel
  estimatedMinutes: number
  aiRole: string
  aiRoleDescription: string
}

export interface Correction {
  id?: number
  wrong: string
  correct: string
  explanationZh: string
  type: CorrectionType
  createdAt: Date
  messageId?: number
  sentenceBookEntryId?: number
}

export interface Message {
  id?: number
  conversationId: number
  role: 'user' | 'ai'
  text: string
  translationZh?: string
  createdAt: Date
}

export interface Conversation {
  id?: number
  date: Date
  scenarioId?: string
  level: UserLevel
  score: number
  completed: boolean
}

export interface SentenceBookEntry {
  id?: number
  createdAt: Date
  nextReviewDate?: Date
  reviewCount: number
  mastered: boolean
  scenarioId?: string
}

export interface DailyProgress {
  id?: number
  date: string
  scenarioCompleted: boolean
  reviewCompleted: boolean
  correctionsCount: number
}

export interface ChatApiCorrection {
  wrong: string
  correct: string
  explanation_zh: string
  type: string
}

export interface ChatApiResponse {
  reply: string
  reply_zh: string
  corrections: ChatApiCorrection[]
}

export interface ChatHistoryMessage {
  role: 'user' | 'assistant'
  content: string
}
