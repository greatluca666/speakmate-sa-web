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
    <div className="flex flex-col items-center gap-2 select-none">
      <button
        type="button"
        disabled={disabled}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerCancel}
        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all
          ${isRecording ? 'bg-red-500 scale-110' : 'bg-blue-500'}
          ${disabled ? 'opacity-50' : 'active:scale-105'}
          text-white shadow-lg`}
        style={{ touchAction: 'none' }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-8 h-8"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3z" />
          <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21H8a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-3v-3.08A7 7 0 0 0 19 11z" />
        </svg>
      </button>
      <span className="text-xs text-gray-500">
        {isRecording ? '松开发送' : '按住说话'}
      </span>
    </div>
  )
}
