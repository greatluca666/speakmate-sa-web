import { useEffect, useRef, useState } from 'react'

interface UseSpeechRecognitionResult {
  transcript: string
  isRecording: boolean
  isSupported: boolean
  error: string | null
  start: () => void
  stop: () => void
  reset: () => void
}

declare global {
  interface Window {
    SpeechRecognition?: any
    webkitSpeechRecognition?: any
  }
}

export function useSpeechRecognition(): UseSpeechRecognitionResult {
  const [transcript, setTranscript] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)
  const transcriptRef = useRef('')

  const Ctor =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : undefined
  const isSupported = !!Ctor

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // ignore
        }
      }
    }
  }, [])

  const start = () => {
    if (!Ctor) {
      setError('浏览器不支持语音识别')
      return
    }
    setError(null)
    setTranscript('')
    transcriptRef.current = ''

    const recognition = new Ctor()
    recognition.lang = 'en-ZA'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: any) => {
      let interim = ''
      let finalText = transcriptRef.current
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalText += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }
      transcriptRef.current = finalText
      setTranscript(finalText + interim)
    }

    recognition.onerror = (event: any) => {
      setError(event.error || '识别失败')
      setIsRecording(false)
    }

    recognition.onend = () => {
      setIsRecording(false)
      setTranscript(transcriptRef.current)
    }

    try {
      recognition.start()
      recognitionRef.current = recognition
      setIsRecording(true)
    } catch (e: any) {
      setError(e?.message || '启动识别失败')
      setIsRecording(false)
    }
  }

  const stop = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // ignore
      }
    }
  }

  const reset = () => {
    setTranscript('')
    transcriptRef.current = ''
    setError(null)
  }

  return { transcript, isRecording, isSupported, error, start, stop, reset }
}
