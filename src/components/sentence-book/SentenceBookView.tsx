import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/database'
import type { SentenceBookEntry, Correction } from '../../types'
import { filterDue, recordReview } from '../../services/reviewScheduler'
import { useSettings } from '../../store/useSettings'
import { synthesizeAndPlay } from '../../services/ttsService'

export function SentenceBookView() {
  const [reviewing, setReviewing] = useState(false)
  const entries = useLiveQuery(
    () => db.sentenceBook.orderBy('createdAt').reverse().toArray(),
    [],
    [] as SentenceBookEntry[]
  )
  const allCorrections = useLiveQuery(() => db.corrections.toArray(), [], [] as Correction[])
  const correctionsByEntry = new Map<number, Correction[]>()
  for (const c of allCorrections || []) {
    if (c.sentenceBookEntryId != null) {
      const arr = correctionsByEntry.get(c.sentenceBookEntryId) || []
      arr.push(c)
      correctionsByEntry.set(c.sentenceBookEntryId, arr)
    }
  }

  const dueEntries = filterDue(entries || [])

  async function handleDelete(id: number) {
    await db.transaction('rw', db.sentenceBook, db.corrections, async () => {
      await db.corrections.where('sentenceBookEntryId').equals(id).delete()
      await db.sentenceBook.delete(id)
    })
  }

  if (reviewing) {
    return (
      <ReviewView
        entries={dueEntries}
        correctionsByEntry={correctionsByEntry}
        onExit={() => setReviewing(false)}
      />
    )
  }

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b safe-top">
        <h1 className="text-xl font-bold">句子本</h1>
      </header>
      <div className="flex-1 overflow-y-auto">
        {dueEntries.length > 0 && (
          <button
            onClick={() => setReviewing(true)}
            className="w-full p-4 bg-orange-50 text-orange-700 font-medium border-b active:bg-orange-100"
          >
            ↻ 待复习：{dueEntries.length} 个
          </button>
        )}
        <div className="text-xs text-gray-500 px-4 py-2 bg-gray-50">
          全部记录（{entries?.length || 0}）
        </div>
        <div className="divide-y">
          {entries?.map((entry) => {
            const corrs = correctionsByEntry.get(entry.id!) || []
            return (
              <div key={entry.id} className="p-4 space-y-2">
                {corrs.map((c) => (
                  <div key={c.id} className="space-y-0.5">
                    <div className="text-sm text-red-600">❌ {c.wrong}</div>
                    <div className="text-sm text-green-700">✅ {c.correct}</div>
                    <div className="text-xs text-gray-500">📝 {c.explanationZh}</div>
                  </div>
                ))}
                <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                  <span>
                    复习 {entry.reviewCount} 次
                    {entry.mastered && <span className="ml-2 text-green-600 font-medium">已掌握</span>}
                  </span>
                  <button
                    onClick={() => handleDelete(entry.id!)}
                    className="text-red-400 active:text-red-600"
                  >
                    删除
                  </button>
                </div>
              </div>
            )
          })}
          {entries?.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-400">
              暂无记录。对话中AI纠正你的错误会自动收录这里。
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ReviewView({
  entries,
  correctionsByEntry,
  onExit
}: {
  entries: SentenceBookEntry[]
  correctionsByEntry: Map<number, Correction[]>
  onExit: () => void
}) {
  const settings = useSettings()
  const [idx, setIdx] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)

  const entry = entries[idx]
  const correction = entry ? correctionsByEntry.get(entry.id!)?.[0] : undefined

  async function handleRemembered() {
    if (!entry) return
    const updated = recordReview(entry)
    await db.sentenceBook.update(entry.id!, updated)
    next()
  }

  function next() {
    setShowAnswer(false)
    setIdx((i) => i + 1)
  }

  function playCorrect() {
    if (!correction) return
    synthesizeAndPlay(correction.correct, settings.voiceName).catch(() => {})
  }

  if (!entry || !correction) {
    return (
      <div className="flex flex-col h-full">
        <header className="p-4 border-b safe-top flex items-center justify-between">
          <button onClick={onExit} className="text-blue-500 text-sm">← 返回</button>
          <div className="font-medium">复习完成</div>
          <div className="w-12" />
        </header>
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="text-5xl">✅</div>
          <div className="text-xl font-medium">复习完成！</div>
          <button onClick={onExit} className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-full">
            返回
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b safe-top flex items-center justify-between">
        <button onClick={onExit} className="text-blue-500 text-sm">← 返回</button>
        <div className="font-medium">
          复习 {idx + 1}/{entries.length}
        </div>
        <div className="w-12" />
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-5">
        <div className="w-full p-5 bg-gray-100 rounded-xl text-center">
          <div className="text-xs text-gray-500 mb-2">原错误</div>
          <div className="text-lg text-red-600">{correction.wrong}</div>
        </div>

        {showAnswer && (
          <div className="w-full p-5 bg-gray-100 rounded-xl text-center space-y-2">
            <div className="text-xs text-gray-500">正确说法</div>
            <button onClick={playCorrect} className="text-lg text-green-700 font-medium underline decoration-dotted">
              🔊 {correction.correct}
            </button>
            <div className="text-sm text-gray-600">{correction.explanationZh}</div>
          </div>
        )}
      </div>
      <div className="p-4 safe-bottom">
        {!showAnswer ? (
          <button
            onClick={() => {
              setShowAnswer(true)
              playCorrect()
            }}
            className="w-full py-3 bg-blue-500 text-white rounded-full font-medium"
          >
            显示答案
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={next} className="py-3 bg-gray-200 rounded-full font-medium">
              还没记住
            </button>
            <button onClick={handleRemembered} className="py-3 bg-blue-500 text-white rounded-full font-medium">
              记住了
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
