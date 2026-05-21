import { EdgeTTS } from 'edge-tts-universal'

export const config = {
  runtime: 'edge'
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let body: { text?: string; voice?: string }
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const text = body.text?.trim()
  const voice = body.voice || 'en-ZA-LeahNeural'

  if (!text) {
    return new Response('Missing text', { status: 400 })
  }
  if (text.length > 1000) {
    return new Response('Text too long', { status: 400 })
  }

  try {
    const tts = new EdgeTTS(text, voice)
    const result = await tts.synthesize()
    const audioBuffer = await result.audio.arrayBuffer()

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400'
      }
    })
  } catch (e: any) {
    return new Response(`TTS error: ${e?.message || 'unknown'}`, { status: 500 })
  }
}
