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
  pipelinePromise = (async () => {
    const transformers: any = await import('@huggingface/transformers')
    transformers.env.allowRemoteModels = true
    transformers.env.useBrowserCache = true

    const pipe: Pipeline = await transformers.pipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-tiny.en',
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
  const pipe = await getWhisperPipeline(onProgress)
  const samples = await blobToFloat32Mono16k(audio)
  if (samples.length < 16000 * 0.2) return ''
  const result = await pipe(samples, {
    chunk_length_s: 30,
    return_timestamps: false
  })
  if (Array.isArray(result)) {
    return result.map((r: any) => r.text || '').join(' ').trim()
  }
  return (result?.text || '').trim()
}
