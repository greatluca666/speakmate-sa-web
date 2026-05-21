import type { SentenceBookEntry } from '../types'

const MASTERY_THRESHOLD = 5
const INTERVALS_DAYS = [1, 3, 7, 14]

export function recordReview(entry: SentenceBookEntry): SentenceBookEntry {
  const reviewCount = entry.reviewCount + 1
  if (reviewCount >= MASTERY_THRESHOLD) {
    return { ...entry, reviewCount, mastered: true, nextReviewDate: undefined }
  }
  const idx = Math.min(reviewCount - 1, INTERVALS_DAYS.length - 1)
  const next = new Date()
  next.setDate(next.getDate() + INTERVALS_DAYS[idx])
  return { ...entry, reviewCount, mastered: false, nextReviewDate: next }
}

export function filterDue(entries: SentenceBookEntry[]): SentenceBookEntry[] {
  const now = new Date()
  return entries.filter((e) => {
    if (e.mastered) return false
    if (!e.nextReviewDate) return true
    return new Date(e.nextReviewDate).getTime() <= now.getTime()
  })
}
