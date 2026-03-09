import { verifyJwt } from '../../lib/jwt'
import { checkRateLimit, type RateLimitEnv } from '../../lib/ratelimit'

interface Env extends RateLimitEnv {
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

interface TranslateBody {
  // New shape (with context window)
  current?: string
  context?: string[]
  // Legacy shape (backward compat)
  text?: string
  // Shared
  targetLang: string
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // Auth is optional for translate (ViewerPage calls it without JWT)
  const auth = await verifyJwt(request).catch(() => null)
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const rlKey = auth?.workspaceSlug ?? `ip:${ip}`

  const rl = await checkRateLimit(env, rlKey, 'translate', auth?.workspaceSlug)
  if (!rl.allowed) {
    return Response.json(
      { error: 'rate_limit', remaining: 0, resetAt: rl.resetAt },
      { status: 429, headers: CORS }
    )
  }

  try {
    const body = await request.json<TranslateBody>()
    const { text, current, context = [], targetLang } = body

    // Support both legacy { text } and new { current, context }
    const lineToTranslate = current ?? text ?? ''

    if (!lineToTranslate.trim() || !targetLang) {
      return Response.json({ translated: lineToTranslate }, { status: 200, headers: CORS })
    }

    const langName = LANG_NAMES[targetLang] ?? targetLang

    const contextSection = context.length > 0
      ? `Previous lines for context only — do not translate these:\n${context.map(l => `- ${l}`).join('\n')}\n\n`
      : ''

    const prompt = `${contextSection}Translate the following line to ${langName}. If it is already in ${langName}, return it unchanged. Use the previous lines only to disambiguate meaning. Return ONLY the translation — no quotes, no explanation.\n\nLine to translate: ${lineToTranslate}`

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
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      return Response.json({ translated: lineToTranslate }, { status: 200, headers: CORS })
    }

    const data = await response.json<{ content: { type: string; text: string }[] }>()
    const translated = data.content.find(c => c.type === 'text')?.text?.trim() ?? lineToTranslate

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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
