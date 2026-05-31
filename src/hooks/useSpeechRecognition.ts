import { useEffect, useRef, useState } from 'react'
import { transcribeLocal, getLocalWhisperStatus } from '../services/localWhisper'

interface UseSpeechRecognitionResult {
  transcript: string
  isRecording: boolean
  isProcessing: boolean
  isSupported: boolean
  modelLoadingProgress: number
  error: string | null
  start: () => Promise<void>
  stop: () => Promise<string>
  reset: () => void
}

declare global {
  interface Window {
    SpeechRecognition?: any
    webkitSpeechRecognition?: any
  }
}

const isIOS =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1))

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  const candidates = [
    'audio/mp4',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus'
  ]
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t
  }
  return undefined
}

async function ensureMicStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('getUserMedia not available (need HTTPS)')
  }
  return navigator.mediaDevices.getUserMedia({ audio: true })
}

export function useSpeechRecognition(): UseSpeechRecognitionResult {
  const [transcript, setTranscript] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [modelLoadingProgress, setModelLoadingProgress] = useState(
    () => getLocalWhisperStatus().progress
  )
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<any>(null)
  const transcriptRef = useRef('')
  const finalResolveRef = useRef<((text: string) => void) | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const isStoppingRef = useRef(false)

  const useWhisper = isIOS

  const WebSpeechCtor =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : undefined
  const webSpeechSupported = !!WebSpeechCtor
  const mediaRecorderSupported = typeof MediaRecorder !== 'undefined'
  const isSupported = useWhisper ? mediaRecorderSupported : webSpeechSupported

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop()
      } catch {
        // ignore
      }
      try {
        if (recorderRef.current?.state === 'recording') {
          recorderRef.current.stop()
        }
      } catch {
        // ignore
      }
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function startWebSpeech() {
    setError(null)
    setTranscript('')
    transcriptRef.current = ''

    try {
      const probe = await ensureMicStream()
      probe.getTracks().forEach((t) => t.stop())
    } catch (e: any) {
      setError('麦克风权限被拒绝: ' + (e?.message || 'unknown'))
      return
    }

    const recognition = new WebSpeechCtor()
    recognition.lang = 'en-ZA'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

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
      const err = event.error || '识别失败'
      if (err === 'no-speech' || err === 'aborted') {
        setIsRecording(false)
        finalResolveRef.current?.(transcriptRef.current)
        finalResolveRef.current = null
        return
      }
      setError(err)
      setIsRecording(false)
      finalResolveRef.current?.(transcriptRef.current)
      finalResolveRef.current = null
    }

    recognition.onend = () => {
      setIsRecording(false)
      setTranscript(transcriptRef.current)
      finalResolveRef.current?.(transcriptRef.current)
      finalResolveRef.current = null
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

  async function startWhisper() {
    console.log('[Whisper] Starting recording...')
    setError(null)
    setTranscript('')
    transcriptRef.current = ''
    isStoppingRef.current = false

    let stream: MediaStream
    try {
      stream = await ensureMicStream()
      console.log('[Whisper] Microphone stream obtained')
    } catch (e: any) {
      console.error('[Whisper] Microphone error:', e)
      setError('麦克风权限被拒绝: ' + (e?.message || 'unknown'))
      return
    }
    streamRef.current = stream

    const mimeType = pickMimeType()
    console.log('[Whisper] Selected mimeType:', mimeType)
    let recorder: MediaRecorder
    try {
      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      console.log('[Whisper] MediaRecorder created, actual mimeType:', recorder.mimeType)
    } catch (e: any) {
      stream.getTracks().forEach((t) => t.stop())
      setError('无法创建录音器: ' + (e?.message || 'unknown'))
      return
    }

    chunksRef.current = []
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = async () => {
      console.log('[Whisper] Recording stopped, chunks:', chunksRef.current.length)
      stream.getTracks().forEach((t) => t.stop())
      streamRef.current = null

      const blob = new Blob(chunksRef.current, {
        type: recorder.mimeType || 'audio/webm'
      })
      console.log('[Whisper] Blob created, size:', blob.size, 'type:', blob.type)
      chunksRef.current = []

      if (blob.size < 200) {
        setIsRecording(false)
        setIsProcessing(false)
        const resolve = finalResolveRef.current
        finalResolveRef.current = null
        resolve?.('')
        return
      }

      setIsRecording(false)
      setIsProcessing(true)
      console.log('[Whisper] Starting transcription...')
      try {
        const text = await transcribeLocal(blob, (pct) => {
          console.log('[Whisper] Transcription progress:', pct + '%')
          setModelLoadingProgress(pct)
        })
        console.log('[Whisper] Transcription result:', text)
        transcriptRef.current = text
        setTranscript(text)

        const resolve = finalResolveRef.current
        finalResolveRef.current = null
        resolve?.(text)
      } catch (e: any) {
        console.error('[Whisper] Transcription error:', e)
        setError('识别失败: ' + (e?.message || 'unknown'))
        const resolve = finalResolveRef.current
        finalResolveRef.current = null
        resolve?.('')
      } finally {
        setIsProcessing(false)
      }
    }

    try {
      // 添加短暂延迟让 MediaRecorder 预热,避免丢失开头
      await new Promise(resolve => setTimeout(resolve, 100))
      recorder.start(100)  // 每100ms收集一次数据
      console.log('[Whisper] Recording started')
      recorderRef.current = recorder
      setIsRecording(true)
    } catch (e: any) {
      stream.getTracks().forEach((t) => t.stop())
      setError(e?.message || '启动录音失败')
    }
  }

  async function start() {
    if (useWhisper) {
      await startWhisper()
    } else {
      await startWebSpeech()
    }
  }

  function stop(): Promise<string> {
    if (isStoppingRef.current) {
      return Promise.resolve(transcriptRef.current)
    }

    isStoppingRef.current = true

    return new Promise((resolve) => {
      finalResolveRef.current = (text: string) => {
        isStoppingRef.current = false
        resolve(text)
      }

      if (useWhisper) {
        if (recorderRef.current && recorderRef.current.state === 'recording') {
          try {
            recorderRef.current.stop()
          } catch (e) {
            console.error('Stop recorder error:', e)
            isStoppingRef.current = false
            resolve(transcriptRef.current)
            finalResolveRef.current = null
          }
        } else {
          isStoppingRef.current = false
          resolve(transcriptRef.current)
          finalResolveRef.current = null
        }
      } else {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop()
          } catch (e) {
            console.error('Stop recognition error:', e)
            isStoppingRef.current = false
            resolve(transcriptRef.current)
            finalResolveRef.current = null
          }
        } else {
          isStoppingRef.current = false
          resolve(transcriptRef.current)
          finalResolveRef.current = null
        }
      }
    })
  }

  function reset() {
    setTranscript('')
    transcriptRef.current = ''
    setError(null)
  }

  return {
    transcript,
    isRecording,
    isProcessing,
    isSupported,
    modelLoadingProgress,
    error,
    start,
    stop,
    reset
  }
}
