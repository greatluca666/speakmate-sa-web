export async function whisperTranscribe(
  audio: Blob,
  apiBase: string,
  apiKey: string,
  language = 'en'
): Promise<string> {
  const base = apiBase.replace(/\/+$/, '')
  const url = `${base}/v1/audio/transcriptions`

  const form = new FormData()
  const extension = audio.type.includes('mp4')
    ? 'mp4'
    : audio.type.includes('webm')
      ? 'webm'
      : audio.type.includes('ogg')
        ? 'ogg'
        : 'wav'
  form.append('file', audio, `recording.${extension}`)
  form.append('model', 'whisper-1')
  form.append('language', language)
  form.append('response_format', 'json')

  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`Whisper ${response.status}: ${errText}`)
  }

  const data = await response.json()
  return (data.text || '').trim()
}
