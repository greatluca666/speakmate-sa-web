import { useLiveQuery } from 'dexie-react-hooks'
import scenariosData from '../../data/scenarios.json'
import type { Scenario, SentenceBookEntry } from '../../types'
import { LEVEL_DISPLAY } from '../../types'
import { db } from '../../db/database'
import { useSettings } from '../../store/useSettings'
import { filterDue } from '../../services/reviewScheduler'

const scenarios = scenariosData as Scenario[]

interface Props {
  onStartScenario: (s: Scenario) => void
  onStartFreeChat: () => void
  onOpenSentenceBook: () => void
}

export function HomeView({ onStartScenario, onStartFreeChat, onOpenSentenceBook }: Props) {
  const settings = useSettings()
  const entries = useLiveQuery(() => db.sentenceBook.toArray(), [], [] as SentenceBookEntry[])
  const dueCount = filterDue(entries || []).length

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weeklyCorrections = (entries || []).filter(
    (e) => new Date(e.createdAt).getTime() >= weekAgo.getTime()
  ).length

  const eligible = scenarios.filter((s) => s.category !== 'free' && s.level === settings.userLevel)
  const fallback = scenarios.filter((s) => s.category !== 'free')
  const pool = eligible.length > 0 ? eligible : fallback
  const dayIndex = Math.floor(Date.now() / 86400000)
  const todayScenario = pool[dayIndex % pool.length]

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b safe-top">
        <h1 className="text-xl font-bold">SpeakMate SA</h1>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {todayScenario && (
          <div className="p-5 bg-gray-100 rounded-2xl space-y-3">
            <div className="text-sm text-blue-500 font-medium">🎯 今日场景</div>
            <div className="text-2xl font-bold">{todayScenario.titleZh}</div>
            <div className="text-sm text-gray-600">{todayScenario.descriptionZh}</div>
            <div className="flex gap-3 text-xs">
              {todayScenario.estimatedMinutes > 0 && (
                <span className="text-gray-500">预计{todayScenario.estimatedMinutes}分钟</span>
              )}
              <span className="text-blue-500">{LEVEL_DISPLAY[settings.userLevel]}</span>
            </div>
            <button
              onClick={() => onStartScenario(todayScenario)}
              className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium"
            >
              开始练习
            </button>
          </div>
        )}

        {dueCount > 0 && (
          <button
            onClick={onOpenSentenceBook}
            className="w-full p-4 bg-orange-50 text-orange-700 rounded-xl flex items-center justify-between active:bg-orange-100"
          >
            <span>📖 复习句子本（{dueCount}个待复习）</span>
            <span>›</span>
          </button>
        )}

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="本周纠错" value={weeklyCorrections} icon="✏️" color="text-purple-500" />
          <StatCard label="总记录" value={entries?.length || 0} icon="📝" color="text-blue-500" />
        </div>

        <button
          onClick={onStartFreeChat}
          className="w-full p-4 bg-gray-100 rounded-xl font-medium flex items-center justify-center gap-2 active:bg-gray-200"
        >
          🎤 自由对话
        </button>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div className="p-4 bg-gray-100 rounded-xl text-center">
      <div className={`text-2xl ${color}`}>{icon}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}
