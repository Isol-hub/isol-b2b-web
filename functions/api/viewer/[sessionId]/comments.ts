import { corsHeaders } from '../../../lib/cors'

interface Env { DB: D1Database; CF_KV_RL: KVNamespace }

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const CORS = corsHeaders(request)
  const sessionId = params.sessionId as string

  // DB-03: Rate-limit unauthenticated GET by IP to prevent bulk enumeration
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const rlKey = `viewer_comments_get:${ip}`
  const rlRaw = await env.CF_KV_RL.get(rlKey).catch(() => null)
  const rlCount = rlRaw ? parseInt(rlRaw, 10) : 0
  if (rlCount > 120) {  // 120 requests per minute per IP
    return Response.json({ error: 'Too many requests' }, { status: 429, headers: CORS })
  }
  env.CF_KV_RL.put(rlKey, String(rlCount + 1), { expirationTtl: 60 }).catch(() => {})

  try {
    const result = await env.DB.prepare(
      'SELECT id, line_index, author, body, created_at FROM viewer_comments WHERE session_id = ? ORDER BY created_at ASC'
    ).bind(sessionId).all()
    return Response.json({ comments: result.results }, { status: 200, headers: CORS })
  } catch (err) {
    console.error('viewer comments fetch error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const CORS = corsHeaders(request)
  const sessionId = params.sessionId as string
  let body: { author?: string; body?: string; line_index?: number | null }
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid body' }, { status: 400, headers: CORS })
  }
  const commentBody = body.body?.trim()
  if (!commentBody) return Response.json({ error: 'Missing body' }, { status: 400, headers: CORS })
  const author = (body.author?.trim() || 'Anonymous').slice(0, 50)
  const lineIndex = typeof body.line_index === 'number' ? body.line_index : null
  const createdAt = Date.now()
  try {
    const result = await env.DB.prepare(
      'INSERT INTO viewer_comments (session_id, line_index, author, body, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(sessionId, lineIndex, author, commentBody.slice(0, 1000), createdAt).run()
    return Response.json(
      { id: result.meta.last_row_id, line_index: lineIndex, author, body: commentBody.slice(0, 1000), created_at: createdAt },
      { status: 201, headers: CORS }
    )
  } catch (err) {
    console.error('viewer comment post error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { status: 204, headers: corsHeaders(request) })
