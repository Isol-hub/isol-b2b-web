interface Env {
  ANTHROPIC_API_KEY: string
}

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

// ISO 639-1 → full language name for clearer Claude prompt
const LANG_NAMES: Record<string, string> = {
  en: 'English', it: 'Italian', es: 'Spanish', fr: 'French', de: 'German',
  pt: 'Portuguese', nl: 'Dutch', pl: 'Polish', ru: 'Russian', zh: 'Chinese',
  ja: 'Japanese', ko: 'Korean', ar: 'Arabic', hi: 'Hindi', tr: 'Turkish',
  sv: 'Swedish', da: 'Danish', fi: 'Finnish', no: 'Norwegian', cs: 'Czech',
  ro: 'Romanian', hu: 'Hungarian', uk: 'Ukrainian', he: 'Hebrew', id: 'Indonesian',
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const { text, targetLang } = await request.json<{ text: string; targetLang: string }>()
    if (!text?.trim() || !targetLang) {
      return Response.json({ translated: text }, { status: 200, headers: CORS })
    }

    const langName = LANG_NAMES[targetLang] ?? targetLang

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: `Translate the following text to ${langName}. If it is already in ${langName}, return it unchanged. Return ONLY the translation — no quotes, no explanation.\n\n${text}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      return Response.json({ translated: text }, { status: 200, headers: CORS })
    }

    const data = await response.json<{ content: { type: string; text: string }[] }>()
    const translated = data.content.find(c => c.type === 'text')?.text?.trim() ?? text

    return Response.json({ translated }, { status: 200, headers: CORS })
  } catch (err) {
    console.error(err)
    return Response.json({ translated: '' }, { status: 500, headers: CORS })
  }
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
