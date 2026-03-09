import { verifyJwt } from '../../lib/jwt'
import { checkRateLimit, type RateLimitEnv } from '../../lib/ratelimit'

interface Env extends RateLimitEnv { ANTHROPIC_API_KEY: string }

const LANG_NAMES: Record<string, string> = {
  en: 'English', it: 'Italian', es: 'Spanish', fr: 'French', de: 'German',
  pt: 'Portuguese', nl: 'Dutch', pl: 'Polish', ru: 'Russian', zh: 'Chinese',
  ja: 'Japanese', ko: 'Korean', ar: 'Arabic', hi: 'Hindi', tr: 'Turkish',
  sv: 'Swedish', da: 'Danish', fi: 'Finnish', no: 'Norwegian', cs: 'Czech',
  ro: 'Romanian', hu: 'Hungarian', uk: 'Ukrainian', he: 'Hebrew', id: 'Indonesian',
}

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyJwt(request).catch(() => null)
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const rlKey = auth?.workspaceSlug ?? `ip:${ip}`
  const rl = await checkRateLimit(env, rlKey, 'notes', auth?.workspaceSlug)
  if (!rl.allowed) {
    return Response.json({ error: 'rate_limit', remaining: 0, resetAt: rl.resetAt }, { status: 429, headers: CORS })
  }

  try {
    const { lines, targetLang } = await request.json<{ lines: string[]; targetLang?: string }>()
    if (!lines?.length) {
      return Response.json({ error: 'No lines provided' }, { status: 400, headers: CORS })
    }

    const rawText = lines.join('\n')
    const langName = targetLang ? (LANG_NAMES[targetLang] ?? targetLang) : null
    const langInstruction = langName && langName !== 'English'
      ? `\nCRITICAL: The transcript is in ${langName}. Write all notes, headings, and quotes in ${langName} — do not translate or switch to any other language.\n`
      : ''

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: `You are an expert note-taker. Below is a live speech transcript (raw, unpunctuated).${langInstruction}

Produce concise, intelligent structured notes that:
- Capture every key idea, decision, and point — nothing significant should be missing
- Use exact quotes from the transcript for important statements (use > blockquote format)
- Are written for quick review, not re-reading the full text
- Surface: main topics, key assertions, decisions made, action items, open questions
- Never invent information or add context not present in the transcript

Output format (use only what applies):
## [Inferred topic title]

### Key Points
- ...

### Decisions & Conclusions
- ...

### Action Items
- [ ] ...

### Open Questions
- ...

### Notable Quotes
> "..."

Return ONLY the structured notes — no commentary, no code blocks.

Transcript:
${rawText}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Anthropic notes error:', err)
      return Response.json({ error: `Anthropic ${response.status}` }, { status: 500, headers: CORS })
    }

    const data = await response.json<{ content: { type: string; text: string }[] }>()
    const notes = data.content.find(c => c.type === 'text')?.text ?? ''

    return Response.json({ notes }, { status: 200, headers: CORS })
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
