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

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyJwt(request).catch(() => null)
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const rlKey = auth?.workspaceSlug ?? `ip:${ip}`
  const rl = await checkRateLimit(env, rlKey, 'define', auth?.workspaceSlug)
  if (!rl.allowed) {
    return Response.json({ error: 'rate_limit', remaining: 0, resetAt: rl.resetAt }, { status: 429, headers: CORS })
  }

  try {
    const { word, sentence, targetLang } = await request.json<{ word: string; sentence: string; targetLang?: string }>()
    if (!word || !sentence) {
      return Response.json({ error: 'word and sentence required' }, { status: 400, headers: CORS })
    }
    const langInstruction = targetLang && targetLang !== 'en'
      ? `Write the definition and context in ${targetLang} language.`
      : ''

    const data = await callAnthropic(env.ANTHROPIC_API_KEY, {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: `The word "${word}" appeared in this spoken context: "${sentence}"

${langInstruction}
Respond ONLY with a valid JSON object (no markdown, no code blocks) with these exact fields:
{
  "definition": "brief dictionary definition, 1-2 sentences",
  "context": "what this word means specifically in this sentence and why it was used, 1-2 sentences",
  "register": "one of: formal / informal / technical / neutral"
}`,
        },
      ],
    })
    const text = data.content.find(c => c.type === 'text')?.text ?? '{}'

    let parsed: { definition: string; context: string; register: string }
    try {
      // Strip potential markdown code fences if the model ignores the instruction
      const clean = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      parsed = { definition: text, context: '', register: 'neutral' }
    }

    return Response.json(parsed, { status: 200, headers: CORS })
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
