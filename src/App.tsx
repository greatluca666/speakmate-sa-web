import { useState } from 'react'
import type { Scenario } from './types'
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
      <div className="h-[100dvh] flex flex-col bg-white">
        <ChatView scenario={chat.scenario} onExit={() => setChat(null)} />
      </div>
    )
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-white">
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

      <nav className="flex border-t bg-white safe-bottom">
        <TabBtn label="首页" icon="🏠" active={tab === 'home'} onClick={() => setTab('home')} />
        <TabBtn label="场景" icon="📚" active={tab === 'scenarios'} onClick={() => setTab('scenarios')} />
        <TabBtn
          label="对话"
          icon="🎤"
          active={false}
          onClick={() => setChat({ scenario: null })}
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
      className={`flex-1 py-2 flex flex-col items-center text-xs gap-0.5 ${
        active ? 'text-blue-500' : 'text-gray-500'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

export default App
