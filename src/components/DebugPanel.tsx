import { useState, useEffect } from 'react'

interface DebugLog {
  timestamp: string
  level: 'info' | 'error' | 'warn'
  message: string
}

export function DebugPanel() {
  const [logs, setLogs] = useState<DebugLog[]>([])
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // 拦截 console.log, console.error, console.warn
    const originalLog = console.log
    const originalError = console.error
    const originalWarn = console.warn

    console.log = (...args: any[]) => {
      originalLog(...args)
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ')
      
      if (message.includes('[Whisper')) {
        setLogs(prev => [...prev, {
          timestamp: new Date().toISOString().split('T')[1].slice(0, -1),
          level: 'info',
          message
        }])
      }
    }

    console.error = (...args: any[]) => {
      originalError(...args)
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ')
      
      if (message.includes('[Whisper')) {
        setLogs(prev => [...prev, {
          timestamp: new Date().toISOString().split('T')[1].slice(0, -1),
          level: 'error',
          message
        }])
      }
    }

    console.warn = (...args: any[]) => {
      originalWarn(...args)
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ')
      
      if (message.includes('[Whisper')) {
        setLogs(prev => [...prev, {
          timestamp: new Date().toISOString().split('T')[1].slice(0, -1),
          level: 'warn',
          message
        }])
      }
    }

    return () => {
      console.log = originalLog
      console.error = originalError
      console.warn = originalWarn
    }
  }, [])

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-20 right-4 z-50 bg-gray-800 text-white px-3 py-2 rounded-full text-xs shadow-lg"
      >
        🐛 调试
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
      <div className="bg-white w-full h-2/3 rounded-t-2xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">调试日志</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setLogs([])}
              className="text-sm text-gray-600 px-3 py-1 bg-gray-100 rounded"
            >
              清空
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="text-sm text-gray-600 px-3 py-1 bg-gray-100 rounded"
            >
              关闭
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
          {logs.length === 0 ? (
            <div className="text-gray-400 text-center py-8">
              暂无日志。开始录音后会显示调试信息。
            </div>
          ) : (
            logs.map((log, i) => (
              <div
                key={i}
                className={`p-2 rounded ${
                  log.level === 'error'
                    ? 'bg-red-50 text-red-800'
                    : log.level === 'warn'
                    ? 'bg-yellow-50 text-yellow-800'
                    : 'bg-blue-50 text-blue-800'
                }`}
              >
                <span className="text-gray-500">[{log.timestamp}]</span>{' '}
                {log.message}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
