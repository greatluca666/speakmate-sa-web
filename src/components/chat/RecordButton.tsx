interface Props {
  isRecording: boolean
  disabled?: boolean
  onStart: () => void
  onStop: () => void
}

export function RecordButton({ isRecording, disabled, onStart, onStop }: Props) {
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    if (disabled) return
    if (!isRecording) onStart()
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault()
    if (isRecording) onStop()
  }

  const handlePointerCancel = () => {
    if (isRecording) onStop()
  }

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="relative">
        {/* 录音时的脉冲环 */}
        {isRecording && (
          <>
            <div className="absolute inset-0 rounded-full bg-red-400 pulse-ring" />
            <div className="absolute inset-0 rounded-full bg-red-400 pulse-ring" style={{ animationDelay: '0.5s' }} />
          </>
        )}
        
        {/* 主按钮 */}
        <button
          type="button"
          disabled={disabled}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={handlePointerCancel}
          className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl
            ${isRecording 
              ? 'bg-gradient-to-br from-red-500 to-red-600 scale-110' 
              : 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-105 cursor-pointer'}
            text-white`}
          style={{ touchAction: 'none' }}
        >
          {/* 内部光晕 */}
          <div className={`absolute inset-2 rounded-full ${
            isRecording ? 'bg-red-400/30' : 'bg-blue-400/30'
          }`} />
          
          {/* 图标 */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-10 h-10 relative z-10 drop-shadow-lg"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3z" />
            <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21H8a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-3v-3.08A7 7 0 0 0 19 11z" />
          </svg>
        </button>
      </div>
      
      {/* 提示文字 */}
      <div className="text-center">
        <span className={`text-sm font-medium transition-colors duration-200 ${
          isRecording ? 'text-red-600' : 'text-gray-600'
        }`}>
          {isRecording ? '🔴 松开发送' : '按住说话'}
        </span>
      </div>
    </div>
  )
}
