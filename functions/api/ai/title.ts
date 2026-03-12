import { verifyJwt } from '../../lib/jwt'
import { checkRateLimit, type RateLimitEnv } from '../../lib/ratelimit'
import { callAnthropic } from '../../lib/anthropic'

interface Env extends RateLimitEnv { ANTHROPIC_API_KEY: string }

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyJwt(request).catch(() => null)
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const rlKey = auth?.workspaceSlug ?? `ip:${ip}`
  const rl = await checkRateLimit(env, rlKey, 'title', auth?.workspaceSlug)
  if (!rl.allowed) {
    return Response.json({ error: 'rate_limit', remaining: 0, resetAt: rl.resetAt }, { status: 429, headers: CORS })
  }

  try {
    const { lines, lang } = await request.json<{ lines: string[]; lang?: string }>()
    if (!lines?.length) {
      return Response.json({ error: 'No lines provided' }, { status: 400, headers: CORS })
    }

    const rawText = lines.slice(0, 10).join('\n')
    const langInstruction = lang
      ? ` Write the title in the same language as the transcript (language code: ${lang}).`
      : ''

    const data = await callAnthropic(env.ANTHROPIC_API_KEY, {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 32,
      messages: [
        {
          role: 'user',
          content: `Generate a concise 3-6 word title that describes the main topic of this speech transcript. Return ONLY the title — no quotes, no punctuation at the end, no commentary.${langInstruction}\n\nTranscript:\n${rawText}`,
        },
      ],
    })
    const title = data.content.find(c => c.type === 'text')?.text?.trim() ?? ''

    return Response.json({ title }, { status: 200, headers: CORS })
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
