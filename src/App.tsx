import { useState } from 'react'
import type { Scenario } from './types'
import { unlockAudio } from './services/ttsService'
import { HomeView } from './components/home/HomeView'
import { ScenarioList } from './components/scenarios/ScenarioList'
import { ChatView } from './components/chat/ChatView'
import { SentenceBookView } from './components/sentence-book/SentenceBookView'
import { SettingsView } from './components/profile/SettingsView'

type Tab = 'home' | 'scenarios' | 'sentence' | 'profile'

interface ChatState {
  scenario: Scenario | null
}

function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [chat, setChat] = useState<ChatState | null>(null)

  if (chat) {
    return (
      <div className="h-[100dvh] flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <ChatView scenario={chat.scenario} onExit={() => setChat(null)} />
      </div>
    )
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <main className="flex-1 overflow-hidden">
        {tab === 'home' && (
          <HomeView
            onStartScenario={(s) => setChat({ scenario: s })}
            onStartFreeChat={() => setChat({ scenario: null })}
            onOpenSentenceBook={() => setTab('sentence')}
          />
        )}
        {tab === 'scenarios' && (
          <ScenarioList onSelect={(s) => setChat({ scenario: s })} />
        )}
        {tab === 'sentence' && <SentenceBookView />}
        {tab === 'profile' && <SettingsView />}
      </main>

      <nav className="flex border-t border-gray-200/50 glass safe-bottom shadow-lg">
        <TabBtn label="首页" icon="🏠" active={tab === 'home'} onClick={() => setTab('home')} />
        <TabBtn label="场景" icon="📚" active={tab === 'scenarios'} onClick={() => setTab('scenarios')} />
        <TabBtn
          label="对话"
          icon="🎤"
          active={false}
          onClick={() => {
            unlockAudio()
            setChat({ scenario: null })
          }}
        />
        <TabBtn label="句子本" icon="📖" active={tab === 'sentence'} onClick={() => setTab('sentence')} />
        <TabBtn label="我的" icon="👤" active={tab === 'profile'} onClick={() => setTab('profile')} />
      </nav>
    </div>
  )
}

function TabBtn({
  label,
  icon,
  active,
  onClick
}: {
  label: string
  icon: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 flex flex-col items-center text-xs gap-1 transition-all duration-200 btn-press ${
        active ? 'text-blue-600 font-medium' : 'text-gray-500'
      }`}
    >
      <span className="text-2xl transition-transform duration-200" style={{ 
        transform: active ? 'scale(1.1)' : 'scale(1)' 
      }}>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

export default App
