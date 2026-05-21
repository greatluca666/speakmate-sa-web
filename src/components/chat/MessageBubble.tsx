import type { Message, Correction, TranslationMode } from '../../types'
import { CorrectionCard } from './CorrectionCard'

interface Props {
  message: Message
  corrections: Correction[]
  translationMode: TranslationMode
}

export function MessageBubble({ message, corrections, translationMode }: Props) {
  const isUser = message.role === 'user'
  const showTranslation = translationMode !== 'never' && !!message.translationZh

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-2`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
          isUser ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-900'
        }`}
      >
        <div className="text-base leading-snug">{message.text}</div>
        {showTranslation && (
          <div className={`text-xs mt-1 ${isUser ? 'text-blue-100' : 'text-gray-600'}`}>
            {message.translationZh}
          </div>
        )}
      </div>

      {corrections.length > 0 && (
        <div className={`w-[85%] space-y-2 ${isUser ? '' : 'ml-0'}`}>
          {corrections.map((c) => (
            <CorrectionCard key={c.id ?? `${c.wrong}-${c.createdAt}`} correction={c} />
          ))}
        </div>
      )}
    </div>
  )
}
