import Dexie, { type Table } from 'dexie'
import type {
  Conversation,
  Message,
  Correction,
  SentenceBookEntry,
  DailyProgress
} from '../types'

export class SpeakMateDB extends Dexie {
  conversations!: Table<Conversation, number>
  messages!: Table<Message, number>
  corrections!: Table<Correction, number>
  sentenceBook!: Table<SentenceBookEntry, number>
  dailyProgress!: Table<DailyProgress, number>

  constructor() {
    super('SpeakMateSA')
    this.version(1).stores({
      conversations: '++id, date, scenarioId, level',
      messages: '++id, conversationId, role, createdAt',
      corrections: '++id, messageId, sentenceBookEntryId, type, createdAt',
      sentenceBook: '++id, createdAt, nextReviewDate, mastered',
      dailyProgress: '++id, &date'
    })
  }
}

export const db = new SpeakMateDB()
