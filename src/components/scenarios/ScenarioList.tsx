import { useState } from 'react'
import scenariosData from '../../data/scenarios.json'
import type { Scenario, ScenarioCategory } from '../../types'
import { LEVEL_DISPLAY, CATEGORY_DISPLAY } from '../../types'

const scenarios = scenariosData as Scenario[]

interface Props {
  onSelect: (scenario: Scenario) => void
}

export function ScenarioList({ onSelect }: Props) {
  const [filter, setFilter] = useState<ScenarioCategory | 'all'>('all')
  const list = filter === 'all' ? scenarios : scenarios.filter((s) => s.category === filter)

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b safe-top">
        <h1 className="text-xl font-bold">练习场景</h1>
      </header>
      <div className="flex gap-2 overflow-x-auto px-4 py-2 border-b">
        <FilterChip label="全部" active={filter === 'all'} onClick={() => setFilter('all')} />
        {(Object.keys(CATEGORY_DISPLAY) as ScenarioCategory[]).map((cat) => (
          <FilterChip
            key={cat}
            label={CATEGORY_DISPLAY[cat]}
            active={filter === cat}
            onClick={() => setFilter(cat)}
          />
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {list.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className="w-full text-left p-4 bg-gray-100 rounded-xl active:bg-gray-200"
          >
            <div className="font-semibold">{s.titleZh}</div>
            <div className="text-sm text-gray-600 mt-1">{s.descriptionZh}</div>
            <div className="flex gap-3 text-xs mt-2">
              <span className="text-blue-500">{LEVEL_DISPLAY[s.level]}</span>
              {s.estimatedMinutes > 0 && (
                <span className="text-gray-500">{s.estimatedMinutes}分钟</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1 rounded-full text-sm ${
        active ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
      }`}
    >
      {label}
    </button>
  )
}
