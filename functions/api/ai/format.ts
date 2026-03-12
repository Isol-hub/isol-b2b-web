import { verifyJwt } from '../../lib/jwt'
import { checkRateLimit, type RateLimitEnv } from '../../lib/ratelimit'
import { callAnthropic } from '../../lib/anthropic'

interface Env extends RateLimitEnv {
  ANTHROPIC_API_KEY: string
}

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

const LANG_NAMES: Record<string, string> = {
  en: 'English', it: 'Italian', es: 'Spanish', fr: 'French', de: 'German',
  pt: 'Portuguese', nl: 'Dutch', pl: 'Polish', ru: 'Russian', zh: 'Chinese',
  ja: 'Japanese', ko: 'Korean', ar: 'Arabic', hi: 'Hindi', tr: 'Turkish',
  sv: 'Swedish', da: 'Danish', fi: 'Finnish', no: 'Norwegian', cs: 'Czech',
  ro: 'Romanian', hu: 'Hungarian', uk: 'Ukrainian', he: 'Hebrew', id: 'Indonesian',
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyJwt(request).catch(() => null)
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const rlKey = auth?.workspaceSlug ?? `ip:${ip}`
  const rl = await checkRateLimit(env, rlKey, 'format', auth?.workspaceSlug)
  if (!rl.allowed) {
    return Response.json({ error: 'rate_limit', remaining: 0, resetAt: rl.resetAt }, { status: 429, headers: CORS })
  }

  try {
    const { lines, targetLang } = await request.json<{ lines: string[]; targetLang?: string }>()
    if (!lines?.length) {
      return Response.json({ error: 'No lines provided' }, { status: 400, headers: CORS })
    }

    const rawText = lines.join(' ')
    const langName = targetLang ? (LANG_NAMES[targetLang] ?? targetLang) : null

    const prompt = langName ? `You are an expert editorial assistant and translator. Below is a raw live speech transcript — unpunctuated, unstructured, captured in real time.

LANGUAGE REQUIREMENT (highest priority): The entire output MUST be written in ${langName}. The transcript may be in a different language — translate every word into ${langName} as you format it.

Transform it into a professionally formatted document in ${langName}.

Rules (all mandatory):
1. Translate ALL content into ${langName} — this overrides faithfulness to the original language
2. Preserve the speaker's meaning, intent, and every concept faithfully — do not add or remove ideas
3. Add proper punctuation: periods, commas, question marks, em-dashes, ellipses where natural
4. Capitalize sentence starts, proper nouns, and acronyms
5. Add a document title at the top (## Title — infer from content, write in ${langName})
6. Add section headings where the topic clearly shifts (### Section — in ${langName})
7. Break into short, readable paragraphs (3–6 sentences each)
8. **Bold** key terms, names, decisions, or phrases that deserve emphasis — use sparingly (max 1–2 per paragraph)
9. When the speaker enumerates items naturally, format them as a bullet list (- item)
10. Return ONLY the formatted document — no preamble, no commentary, no code blocks

Raw transcript:
${rawText}`
    : `You are an expert editorial assistant. Below is a raw live speech transcript — unpunctuated, unstructured, captured in real time.
Transform it into a professionally formatted document while remaining 100% faithful to the speaker's exact words. Your job is editorial structure, not rewriting.

Rules (all mandatory):
1. Keep every single word from the original — do not add, remove, paraphrase, or substitute any content
2. Add proper punctuation: periods, commas, question marks, em-dashes, ellipses where natural
3. Capitalize sentence starts, proper nouns, and acronyms
4. Add a document title at the top (## Title — infer from content)
5. Add section headings where the topic clearly shifts (### Section)
6. Break into short, readable paragraphs (3–6 sentences each)
7. **Bold** key terms, names, decisions, or phrases that deserve emphasis — use sparingly (max 1–2 per paragraph)
8. When the speaker enumerates items naturally, format them as a bullet list (- item)
9. Preserve the speaker's voice, rhythm, and intent exactly
10. Return ONLY the formatted document — no preamble, no commentary, no code blocks

Raw transcript:
${rawText}`

    const data = await callAnthropic(env.ANTHROPIC_API_KEY, {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })
    const formatted = data.content.find(c => c.type === 'text')?.text ?? rawText

    return Response.json({ formatted }, { status: 200, headers: CORS })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal error' }, { status: 500, headers: CORS })
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
