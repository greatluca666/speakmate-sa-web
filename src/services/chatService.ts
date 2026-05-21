import type {
  ChatApiResponse,
  ChatHistoryMessage,
  UserLevel
} from '../types'

export function buildSystemPrompt(
  level: UserLevel,
  scenarioRole?: string,
  scenarioDescription?: string
): string {
  let prompt = `You are a friendly South African English speaker helping someone practice English conversation.
The user's level is: ${level}.`

  if (scenarioRole && scenarioDescription) {
    prompt += `\nYou are playing the role of a ${scenarioRole}. ${scenarioDescription}`
  }

  if (level === 'beginner') {
    prompt += '\nUse simple, short sentences. Common vocabulary only.'
  } else if (level === 'intermediate') {
    prompt += '\nUse moderately complex sentences. Include some idioms.'
  } else {
    prompt += '\nSpeak naturally. Use South African slang and local expressions.'
  }

  prompt += `

IMPORTANT: Always respond in valid JSON with this exact structure:
{
  "reply": "your English reply",
  "reply_zh": "Chinese translation of your reply",
  "corrections": [
    {
      "wrong": "what the user said wrong",
      "correct": "the correct way to say it",
      "explanation_zh": "explanation in Chinese",
      "type": "grammar|vocabulary|article|preposition|tense|pronunciation|other"
    }
  ]
}

User input comes from speech recognition. IGNORE these — do NOT correct:
- Capitalization (lowercase is fine)
- Missing or wrong punctuation (commas, periods, question marks)
- Spelling that sounds correct phonetically (homophones from STT)
- Filler words / hesitations / repetitions

ONLY correct real language mistakes:
- Wrong verb tense (e.g. "I go yesterday" → "I went yesterday")
- Missing or wrong articles (a/an/the) ONLY if the meaning changes
- Wrong word choice / vocabulary errors
- Wrong preposition (e.g. "depend of" → "depend on")
- Grammar mistakes that a native speaker would notice in conversation

If the user made no real mistakes, return an empty corrections array.
In your reply, naturally use the correct form of anything the user said wrong — do NOT explicitly point out their mistakes in the conversation.`

  return prompt
}

export async function sendChatMessage(
  apiBase: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: ChatHistoryMessage[],
  userMessage: string
): Promise<ChatApiResponse> {
  const base = apiBase.replace(/\/+$/, '')
  const url = `${base}/v1/chat/completions`

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userMessage }
  ]

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages
    })
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown error')
    throw new Error(`Chat API error ${response.status}: ${errText}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty response from chat API')

  const jsonText = extractJsonObject(content)
  const parsed: ChatApiResponse = JSON.parse(jsonText)
  if (typeof parsed.reply !== 'string') {
    throw new Error('Invalid chat response shape')
  }
  if (!Array.isArray(parsed.corrections)) {
    parsed.corrections = []
  }
  if (typeof parsed.reply_zh !== 'string') {
    parsed.reply_zh = ''
  }
  return parsed
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim()
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenceMatch) return fenceMatch[1].trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1)
  }
  return trimmed
}
