const CACHE_KEY_PREFIX = 'tts_audio_'
const CACHE_INDEX_KEY = 'tts_audio_index'
const MAX_CACHE_ENTRIES = 200

function hashText(text: string): string {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0
  }
  return Math.abs(hash).toString(16)
}

function getIndex(): string[] {
  try {
    const raw = localStorage.getItem(CACHE_INDEX_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function setIndex(keys: string[]): void {
  try {
    localStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(keys))
  } catch {
    // storage full
  }
}

function getCachedDataUrl(key: string): string | null {
  return localStorage.getItem(CACHE_KEY_PREFIX + key)
}

function setCachedDataUrl(key: string, dataUrl: string): void {
  let index = getIndex()
  index = index.filter((k) => k !== key)
  index.push(key)
  while (index.length > MAX_CACHE_ENTRIES) {
    const evict = index.shift()
    if (evict) localStorage.removeItem(CACHE_KEY_PREFIX + evict)
  }
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + key, dataUrl)
    setIndex(index)
  } catch {
    while (index.length > 0) {
      const evict = index.shift()
      if (evict) localStorage.removeItem(CACHE_KEY_PREFIX + evict)
      try {
        localStorage.setItem(CACHE_KEY_PREFIX + key, dataUrl)
        setIndex(index.concat(key))
        return
      } catch {
        continue
      }
    }
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export async function synthesizeAndPlay(text: string, voiceName: string): Promise<void> {
  const key = hashText(`${voiceName}|${text}`)
  const cached = getCachedDataUrl(key)
  if (cached) {
    await playUrl(cached)
    return
  }

  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice: voiceName })
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`TTS ${response.status}: ${errText}`)
  }

  const blob = await response.blob()
  const dataUrl = await blobToDataUrl(blob)
  setCachedDataUrl(key, dataUrl)
  await playUrl(dataUrl)
}

function playUrl(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url)
    audio.onended = () => resolve()
    audio.onerror = () => reject(new Error('Audio playback failed'))
    audio.play().catch(reject)
  })
}
