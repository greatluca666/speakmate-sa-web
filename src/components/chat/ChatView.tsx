import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type {
  Scenario,
  Message,
  Correction,
  ChatHistoryMessage,
  CorrectionType
} from '../../types'
import { levelTranslationMode, LEVEL_DISPLAY } from '../../types'
import { db } from '../../db/database'
import { useSettings } from '../../store/useSettings'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'
import { buildSystemPrompt, sendChatMessage } from '../../services/chatService'
import { synthesizeAndPlay } from '../../services/ttsService'
import { MessageBubble } from './MessageBubble'
import { RecordButton } from './RecordButton'

interface Props {
  scenario: Scenario | null
  onExit: () => void
}

export function ChatView({ scenario, onExit }: Props) {
  const settings = useSettings()
  const speech = useSpeechRecognition()
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const historyRef = useRef<ChatHistoryMessage[]>([])
  const initStartedRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const messages = useLiveQuery(
    () =>
      conversationId
        ? db.messages.where('conversationId').equals(conversationId).sortBy('createdAt')
        : Promise.resolve([] as Message[]),
    [conversationId]
  )
  const allCorrections = useLiveQuery(() => db.corrections.toArray(), [], [] as Correction[])
  const correctionsByMessage = new Map<number, Correction[]>()
  for (const c of allCorrections || []) {
    if (c.messageId != null) {
      const arr = correctionsByMessage.get(c.messageId) || []
      arr.push(c)
      correctionsByMessage.set(c.messageId, arr)
    }
  }

  const translationMode = levelTranslationMode(settings.userLevel)
  const settingsReady = !!settings.apiBase && !!settings.apiKey && !!settings.apiModel

  useEffect(() => {
    if (initStartedRef.current) return
    initStartedRef.current = true
    ;(async () => {
      const id = (await db.conversations.add({
        date: new Date(),
        scenarioId: scenario?.id,
        level: settings.userLevel,
        score: 0,
        completed: false
      })) as number
      setConversationId(id)
      if (scenario && settingsReady) {
        const greeting = `${scenario.aiRoleDescription} Greet the customer first and ask how you can help today.`
        await sendToAI(greeting, true, id)
      }
    })()
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages?.length])

  async function sendToAI(userText: string, isInitial: boolean, convId: number) {
    if (!settingsReady) {
      setError('请先在设置里填写 API 信息')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const systemPrompt = buildSystemPrompt(
        settings.userLevel,
        scenario?.aiRole,
        scenario?.aiRoleDescription
      )
      const response = await sendChatMessage(
        settings.apiBase,
        settings.apiKey,
        settings.apiModel,
        systemPrompt,
        historyRef.current,
        userText
      )

      if (!isInitial) {
        historyRef.current.push({ role: 'user', content: userText })
      }
      historyRef.current.push({
        role: 'assistant',
        content: JSON.stringify(response)
      })

      const aiMessageId = (await db.messages.add({
        conversationId: convId,
        role: 'ai',
        text: response.reply,
        translationZh: response.reply_zh,
        createdAt: new Date()
      })) as number

      for (const cd of response.corrections) {
        const corrType = (
          ['grammar', 'vocabulary', 'article', 'preposition', 'tense', 'pronunciation', 'other'].includes(
            cd.type
          )
            ? cd.type
            : 'other'
        ) as CorrectionType
        const sentenceEntryId = (await db.sentenceBook.add({
          createdAt: new Date(),
          reviewCount: 0,
          mastered: false,
          scenarioId: scenario?.id
        })) as number
        await db.corrections.add({
          wrong: cd.wrong,
          correct: cd.correct,
          explanationZh: cd.explanation_zh,
          type: corrType,
          createdAt: new Date(),
          messageId: aiMessageId,
          sentenceBookEntryId: sentenceEntryId
        })
      }

      synthesizeAndPlay(response.reply, settings.voiceName).catch((e) =>
        setError('TTS: ' + (e?.message || String(e)))
      )
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleStopRecording() {
    speech.stop()
    const text = speech.transcript.trim()
    if (!text || !conversationId) return
    await db.messages.add({
      conversationId,
      role: 'user',
      text,
      createdAt: new Date()
    })
    await sendToAI(text, false, conversationId)
    speech.reset()
  }

  function handleReplay(text: string) {
    synthesizeAndPlay(text, settings.voiceName).catch((e) =>
      setError('TTS: ' + (e?.message || String(e)))
    )
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between p-3 border-b safe-top">
        <button onClick={onExit} className="text-blue-500 text-sm">← 返回</button>
        <div className="font-medium">{scenario?.titleZh || '自由对话'}</div>
        <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
          {LEVEL_DISPLAY[settings.userLevel]}
        </span>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {!settingsReady && (
          <div className="text-center text-sm text-gray-500 py-8">
            请在"我的"标签里填写 API 设置后再开始对话
          </div>
        )}
        {messages?.map((m) => (
          <div
            key={m.id}
            onClick={() => m.role === 'ai' && handleReplay(m.text)}
            className={m.role === 'ai' ? 'cursor-pointer' : ''}
          >
            <MessageBubble
              message={m}
              corrections={correctionsByMessage.get(m.id!) || []}
              translationMode={translationMode}
            />
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
        )}
        {error && (
          <div className="text-red-500 text-xs p-2 bg-red-50 rounded">{error}</div>
        )}
        {speech.transcript && speech.isRecording && (
          <div className="text-right text-sm text-gray-400 italic">
            {speech.transcript}
          </div>
        )}
      </div>

      <div className="p-4 border-t safe-bottom flex flex-col items-center gap-1">
        {!speech.isSupported && (
          <div className="text-xs text-red-500 mb-2">
            当前浏览器不支持语音识别，请用 Safari/Chrome
          </div>
        )}
        <RecordButton
          isRecording={speech.isRecording}
          disabled={!speech.isSupported || isLoading}
          onStart={speech.start}
          onStop={handleStopRecording}
        />
      </div>
    </div>
  )
}
