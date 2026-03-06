import { decodeJwt } from '../../lib/jwt'

interface Env {
  DB: D1Database
}

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = decodeJwt(request)
  if (!auth) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })
  }

  let body: { session_id?: number }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid body' }, { status: 400, headers: CORS })
  }

  const sessionId = body.session_id
  if (!sessionId || typeof sessionId !== 'number') {
    return Response.json({ error: 'Missing session_id' }, { status: 400, headers: CORS })
  }

  try {
    const session = await env.DB.prepare(
      'SELECT workspace_slug, share_token FROM sessions WHERE id = ?'
    ).bind(sessionId).first<{ workspace_slug: string; share_token: string | null }>()

    if (!session) {
      return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
    }

    if (session.workspace_slug !== auth.workspaceSlug) {
      return Response.json({ error: 'Forbidden' }, { status: 403, headers: CORS })
    }

    if (session.share_token) {
      return Response.json({ token: session.share_token }, { status: 200, headers: CORS })
    }

    const token = crypto.randomUUID()
    await env.DB.prepare(
      'UPDATE sessions SET share_token = ? WHERE id = ?'
    ).bind(token, sessionId).run()

    return Response.json({ token }, { status: 200, headers: CORS })
  } catch (err) {
    console.error('share generate error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
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
