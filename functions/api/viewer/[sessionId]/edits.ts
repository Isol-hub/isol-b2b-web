import { verifyJwt } from '../../../lib/jwt'
import { corsHeaders } from '../../../lib/cors'

interface Env { DB: D1Database }

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const CORS = corsHeaders(request)
  const sessionId = params.sessionId as string
  try {
    const result = await env.DB.prepare(
      'SELECT line_index, text, updated_at FROM session_edits WHERE session_id = ? ORDER BY line_index ASC'
    ).bind(sessionId).all()
    return Response.json({ edits: result.results }, { status: 200, headers: CORS })
  } catch (err) {
    console.error('edits fetch error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const CORS = corsHeaders(request)
  const auth = await verifyJwt(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })

  const sessionId = params.sessionId as string
  let body: { line_index?: number; text?: string; workspace_slug?: string }
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid body' }, { status: 400, headers: CORS })
  }
  if (typeof body.line_index !== 'number' || typeof body.text !== 'string') {
    return Response.json({ error: 'Missing line_index or text' }, { status: 400, headers: CORS })
  }

  // AUTH-05: Verify the live session belongs to the authenticated user's workspace
  const session = await env.DB.prepare(
    'SELECT id FROM sessions WHERE wss_session_id = ? AND workspace_slug = ?'
  ).bind(sessionId, auth.workspaceSlug).first()
  if (!session) {
    return Response.json({ error: 'Forbidden' }, { status: 403, headers: CORS })
  }

  try {
    await env.DB.prepare(
      `INSERT INTO session_edits (session_id, line_index, text, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(session_id, line_index) DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at`
    ).bind(sessionId, body.line_index, body.text.slice(0, 2000), Date.now()).run()
    return Response.json({ ok: true }, { status: 200, headers: CORS })
  } catch (err) {
    console.error('edit post error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { status: 204, headers: corsHeaders(request) })
