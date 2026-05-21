import { useSettings } from '../../store/useSettings'
import type { UserLevel } from '../../types'
import { LEVEL_DISPLAY } from '../../types'

export function SettingsView() {
  const s = useSettings()
  const levels: UserLevel[] = ['beginner', 'intermediate', 'fluent']

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b safe-top">
        <h1 className="text-xl font-bold">我的</h1>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <Section title="难度等级">
          <div className="grid grid-cols-3 gap-2">
            {levels.map((lv) => (
              <button
                key={lv}
                onClick={() => s.setUserLevel(lv)}
                className={`py-2 rounded-lg text-sm ${
                  s.userLevel === lv ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {LEVEL_DISPLAY[lv]}
              </button>
            ))}
          </div>
        </Section>

        <Section title="对话AI配置 (OpenAI兼容)">
          <Field label="API 地址" value={s.apiBase} onChange={s.setApiBase} placeholder="https://api.example.com" />
          <Field label="API 密钥" value={s.apiKey} onChange={s.setApiKey} placeholder="sk-..." type="password" />
          <Field label="模型名称" value={s.apiModel} onChange={s.setApiModel} placeholder="gpt-4o-mini" />
        </Section>

        <Section title="语音 (免费 Edge TTS)">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">语音</label>
            <select
              value={s.voiceName}
              onChange={(e) => s.setVoiceName(e.target.value)}
              className="w-full p-3 bg-gray-100 rounded-lg text-base"
            >
              <option value="en-ZA-LeahNeural">Leah (女声 · 南非)</option>
              <option value="en-ZA-LukeNeural">Luke (男声 · 南非)</option>
            </select>
            <p className="text-xs text-gray-400 mt-2">
              使用微软 Edge 免费 TTS 服务，无需 API 密钥
            </p>
          </div>
        </Section>

        <div className="text-xs text-gray-400 text-center pt-4">
          SpeakMate SA · 南非口音英语陪练
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wide text-gray-500">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text'
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className="w-full p-3 bg-gray-100 rounded-lg text-base"
      />
    </div>
  )
}
