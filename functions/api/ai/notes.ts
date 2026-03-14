import { verifyJwt } from '../../lib/jwt'
import { checkRateLimit, type RateLimitEnv } from '../../lib/ratelimit'
import { callAnthropic } from '../../lib/anthropic'
import { corsHeaders } from '../../lib/cors'

interface Env extends RateLimitEnv { ANTHROPIC_API_KEY: string }

const LANG_NAMES: Record<string, string> = {
  en: 'English',    it: 'Italian',     es: 'Spanish',    fr: 'French',      de: 'German',
  pt: 'Portuguese', nl: 'Dutch',       pl: 'Polish',     ru: 'Russian',     zh: 'Chinese',
  ja: 'Japanese',   ko: 'Korean',      ar: 'Arabic',     hi: 'Hindi',       tr: 'Turkish',
  uk: 'Ukrainian',  sv: 'Swedish',     da: 'Danish',     fi: 'Finnish',     nb: 'Norwegian',
  no: 'Norwegian',  el: 'Greek',       cs: 'Czech',      ro: 'Romanian',    hu: 'Hungarian',
  sk: 'Slovak',     bg: 'Bulgarian',   hr: 'Croatian',   sr: 'Serbian',     sl: 'Slovenian',
  mk: 'Macedonian', be: 'Belarusian',  et: 'Estonian',   lv: 'Latvian',     lt: 'Lithuanian',
  id: 'Indonesian', ms: 'Malay',       tl: 'Filipino',   vi: 'Vietnamese',  th: 'Thai',
  ta: 'Tamil',      bn: 'Bengali',     ur: 'Urdu',       he: 'Hebrew',      kk: 'Kazakh',
  sw: 'Swahili',    am: 'Amharic',     si: 'Sinhala',
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const CORS = corsHeaders(request)
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
    const langInstruction = langName
      ? `\nCRITICAL: Write all notes, headings, and quotes in ${langName}. Detect the source language automatically and translate if needed.\n`
      : ''

    const data = await callAnthropic(env.ANTHROPIC_API_KEY, {
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
    })
    const notes = data.content.find(c => c.type === 'text')?.text ?? ''

    return Response.json({ notes }, { status: 200, headers: CORS })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal error' }, { status: 500, headers: CORS })
  }
}

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { status: 204, headers: corsHeaders(request) })
