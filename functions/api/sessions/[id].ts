import { decodeJwt } from '../../lib/jwt'

interface Env {
  DB: D1Database
}

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = decodeJwt(request)
  if (!auth) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })
  }

  const sessionId = Number(params.id)
  if (!sessionId || isNaN(sessionId)) {
    return Response.json({ error: 'Invalid session id' }, { status: 400, headers: CORS })
  }

  try {
    const session = await env.DB.prepare(
      'SELECT * FROM sessions WHERE id = ?'
    ).bind(sessionId).first()

    if (!session) {
      return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
    }

    if (session.workspace_slug !== auth.workspaceSlug) {
      return Response.json({ error: 'Forbidden' }, { status: 403, headers: CORS })
    }

    const linesResult = await env.DB.prepare(
      'SELECT line_index, text FROM transcript_lines WHERE session_id = ? ORDER BY line_index ASC'
    ).bind(sessionId).all()

    return Response.json({ session, lines: linesResult.results }, { status: 200, headers: CORS })
  } catch (err) {
    console.error('session detail error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = decodeJwt(request)
  if (!auth) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })
  }

  const sessionId = Number(params.id)
  if (!sessionId || isNaN(sessionId)) {
    return Response.json({ error: 'Invalid session id' }, { status: 400, headers: CORS })
  }

  try {
    const session = await env.DB.prepare(
      'SELECT workspace_slug FROM sessions WHERE id = ?'
    ).bind(sessionId).first()

    if (!session) {
      return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
    }

    if (session.workspace_slug !== auth.workspaceSlug) {
      return Response.json({ error: 'Forbidden' }, { status: 403, headers: CORS })
    }

    const body = await request.json<{ title?: string }>()
    const title = body.title?.trim() ?? null

    await env.DB.prepare(
      'UPDATE sessions SET title = ? WHERE id = ?'
    ).bind(title, sessionId).run()

    return Response.json({ ok: true }, { headers: CORS })
  } catch (err) {
    console.error('session patch error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
