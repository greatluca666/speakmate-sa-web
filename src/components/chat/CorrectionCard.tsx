import type { Correction, CorrectionType } from '../../types'

interface Props {
  correction: Correction
}

const TYPE_LABEL: Record<CorrectionType, string> = {
  grammar: '语法',
  vocabulary: '词汇',
  article: '冠词',
  preposition: '介词',
  tense: '时态',
  pronunciation: '发音',
  other: '其他'
}

export function CorrectionCard({ correction }: Props) {
  return (
    <div className="rounded-xl bg-gray-100 p-3 text-sm space-y-1">
      <div className="flex items-start gap-2">
        <span>❌</span>
        <span className="text-red-600 line-through">{correction.wrong}</span>
      </div>
      <div className="flex items-start gap-2">
        <span>✅</span>
        <span className="text-green-700 font-medium">{correction.correct}</span>
      </div>
      <div className="flex items-start gap-2 text-xs text-gray-600">
        <span>📝</span>
        <span>
          <span className="font-medium">[{TYPE_LABEL[correction.type]}]</span>{' '}
          {correction.explanationZh}
        </span>
      </div>
    </div>
  )
}
