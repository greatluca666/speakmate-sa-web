import { EdgeTTS } from 'edge-tts-universal'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed')
    return
  }

  const body = req.body || {}
  const text = (body.text || '').trim()
  const voice = body.voice || 'en-ZA-LeahNeural'

  if (!text) {
    res.status(400).send('Missing text')
    return
  }
  if (text.length > 1000) {
    res.status(400).send('Text too long')
    return
  }

  try {
    const tts = new EdgeTTS(text, voice)
    const result = await tts.synthesize()
    const audioBuffer = await result.audio.arrayBuffer()

    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.status(200).send(Buffer.from(audioBuffer))
  } catch (e: any) {
    res.status(500).send(`TTS error: ${e?.message || 'unknown'}`)
  }
}
