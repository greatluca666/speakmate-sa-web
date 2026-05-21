import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import type { Plugin } from 'vite'

function devTtsApiPlugin(): Plugin {
  return {
    name: 'dev-tts-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/api/tts' || req.method !== 'POST') {
          return next()
        }

        let raw = ''
        req.on('data', (chunk) => {
          raw += chunk
        })
        req.on('end', async () => {
          try {
            const body = JSON.parse(raw || '{}')
            const text = (body.text || '').trim()
            const voice = body.voice || 'en-ZA-LeahNeural'
            if (!text) {
              res.statusCode = 400
              res.end('Missing text')
              return
            }
            const { EdgeTTS } = await import('edge-tts-universal')
            const tts = new EdgeTTS(text, voice)
            const result = await tts.synthesize()
            const audioBuffer = await result.audio.arrayBuffer()
            res.statusCode = 200
            res.setHeader('Content-Type', 'audio/mpeg')
            res.setHeader('Cache-Control', 'public, max-age=86400')
            res.end(Buffer.from(audioBuffer))
          } catch (e: any) {
            res.statusCode = 500
            res.end(`TTS error: ${e?.message || 'unknown'}`)
          }
        })
      })
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    devTtsApiPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'SpeakMate SA',
        short_name: 'SpeakMate',
        description: '南非口音英语陪练',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    port: 5173
  }
})
