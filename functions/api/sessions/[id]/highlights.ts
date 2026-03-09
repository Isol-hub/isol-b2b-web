import { verifyJwt } from '../../../lib/jwt'

interface Env {
  DB: D1Database
}

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

async function authedSession(request: Request, env: Env, sessionId: number) {
  const auth = await verifyJwt(request)
  if (!auth) return null
  const session = await env.DB.prepare(
    'SELECT workspace_slug FROM sessions WHERE id = ?'
  ).bind(sessionId).first()
  if (!session || session.workspace_slug !== auth.workspaceSlug) return null
  return auth
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const sessionId = Number(params.id)
  if (!sessionId) return Response.json({ error: 'Invalid id' }, { status: 400, headers: CORS })
  const auth = await authedSession(request, env, sessionId)
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403, headers: CORS })

  const result = await env.DB.prepare(
    'SELECT id, line_index, text, category, created_at FROM session_highlights WHERE session_id = ? ORDER BY created_at ASC'
  ).bind(sessionId).all()

  return Response.json({ highlights: result.results }, { headers: CORS })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const sessionId = Number(params.id)
  if (!sessionId) return Response.json({ error: 'Invalid id' }, { status: 400, headers: CORS })
  const auth = await authedSession(request, env, sessionId)
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403, headers: CORS })

  const body = await request.json<{ line_index?: number | null; text: string; category?: string | null }>()
  if (!body.text?.trim()) return Response.json({ error: 'Missing text' }, { status: 400, headers: CORS })

  const result = await env.DB.prepare(
    'INSERT INTO session_highlights (session_id, line_index, text, category, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(sessionId, body.line_index ?? null, body.text.trim(), body.category ?? null, Date.now()).run()

  return Response.json({ id: result.meta.last_row_id }, { status: 201, headers: CORS })
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const sessionId = Number(params.id)
  if (!sessionId) return Response.json({ error: 'Invalid id' }, { status: 400, headers: CORS })
  const auth = await authedSession(request, env, sessionId)
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403, headers: CORS })

  const highlightId = Number(new URL(request.url).searchParams.get('highlight_id'))
  if (!highlightId) return Response.json({ error: 'Missing highlight_id' }, { status: 400, headers: CORS })

  await env.DB.prepare(
    'DELETE FROM session_highlights WHERE id = ? AND session_id = ?'
  ).bind(highlightId, sessionId).run()

  return Response.json({ ok: true }, { headers: CORS })
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
