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
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-md ${
          isUser 
            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
            : 'bg-white text-gray-900 border border-gray-100'
        }`}
      >
        <div className="text-base leading-relaxed">{message.text}</div>
        {showTranslation && (
          <div className={`text-xs mt-2 pt-2 border-t ${
            isUser ? 'text-blue-100 border-blue-400/30' : 'text-gray-500 border-gray-200'
          }`}>
            {message.translationZh}
          </div>
        )}
      </div>

      {corrections.length > 0 && (
        <div className={`w-[90%] space-y-2 ${isUser ? '' : 'ml-0'}`}>
          {corrections.map((c) => (
            <CorrectionCard key={c.id ?? `${c.wrong}-${c.createdAt}`} correction={c} />
          ))}
        </div>
      )}
    </div>
  )
}
