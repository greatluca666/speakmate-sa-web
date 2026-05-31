type Pipeline = (input: any, opts?: any) => Promise<any>

let pipelinePromise: Promise<Pipeline> | null = null
let loadProgress = 0
let loadStatus: 'idle' | 'loading' | 'ready' | 'error' = 'idle'

export function getLocalWhisperStatus() {
  return { status: loadStatus, progress: loadProgress }
}

export async function preloadLocalWhisper(
  onProgress?: (pct: number) => void
): Promise<void> {
  await getWhisperPipeline(onProgress)
}

async function getWhisperPipeline(
  onProgress?: (pct: number) => void
): Promise<Pipeline> {
  if (pipelinePromise) return pipelinePromise
  loadStatus = 'loading'
  console.log('[Whisper Model] Starting to load model...')
  pipelinePromise = (async () => {
    const transformers: any = await import('@huggingface/transformers')
    console.log('[Whisper Model] Transformers library loaded')
    transformers.env.allowRemoteModels = true
    transformers.env.useBrowserCache = true

    // 使用 base 模型替代 tiny,准确率更高
    const pipe: Pipeline = await transformers.pipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-base.en',
      {
        progress_callback: (data: any) => {
          if (typeof data.progress === 'number') {
            loadProgress = Math.round(data.progress)
            onProgress?.(loadProgress)
          }
        }
      }
    )
    loadStatus = 'ready'
    loadProgress = 100
    onProgress?.(100)
    console.log('[Whisper Model] Model loaded successfully')
    return pipe
  })().catch((e) => {
    loadStatus = 'error'
    pipelinePromise = null
    throw e
  })
  return pipelinePromise
}

async function blobToFloat32Mono16k(blob: Blob): Promise<Float32Array> {
  const buffer = await blob.arrayBuffer()
  const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext
  const ac = new Ctor({ sampleRate: 16000 })
  try {
    const audioBuffer: AudioBuffer = await new Promise((resolve, reject) =>
      ac.decodeAudioData(buffer.slice(0), resolve, reject)
    )
    const channels = audioBuffer.numberOfChannels
    const length = audioBuffer.length
    const mono = new Float32Array(length)
    for (let ch = 0; ch < channels; ch++) {
      const data = audioBuffer.getChannelData(ch)
      for (let i = 0; i < length; i++) mono[i] += data[i] / channels
    }
    if (audioBuffer.sampleRate === 16000) return mono
    return resample(mono, audioBuffer.sampleRate, 16000)
  } finally {
    try {
      await ac.close()
    } catch {
      // ignore
    }
  }
}

function resample(input: Float32Array, inRate: number, outRate: number): Float32Array {
  if (inRate === outRate) return input
  const ratio = inRate / outRate
  const outLength = Math.floor(input.length / ratio)
  const out = new Float32Array(outLength)
  for (let i = 0; i < outLength; i++) {
    const idx = i * ratio
    const i0 = Math.floor(idx)
    const i1 = Math.min(i0 + 1, input.length - 1)
    const t = idx - i0
    out[i] = input[i0] * (1 - t) + input[i1] * t
  }
  return out
}

export async function transcribeLocal(
  audio: Blob,
  onProgress?: (pct: number) => void
): Promise<string> {
  console.log('[Whisper Model] transcribeLocal called, blob size:', audio.size, 'type:', audio.type)
  const pipe = await getWhisperPipeline(onProgress)
  console.log('[Whisper Model] Converting audio to samples...')
  const samples = await blobToFloat32Mono16k(audio)
  console.log('[Whisper Model] Samples length:', samples.length, 'duration:', samples.length / 16000, 'seconds')
  
  // 降低最小长度要求,避免丢失短语音
  if (samples.length < 16000 * 0.1) return ''
  
  console.log('[Whisper Model] Starting transcription with pipe...')
  const result = await pipe(samples, {
    chunk_length_s: 30,
    return_timestamps: false,
    // 添加语言提示提高准确率
    language: 'english'
  })
  console.log('[Whisper Model] Transcription complete, result:', result)
  
  if (Array.isArray(result)) {
    return result.map((r: any) => r.text || '').join(' ').trim()
  }
  return (result?.text || '').trim()
}
