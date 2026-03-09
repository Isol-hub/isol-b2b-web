import { verifyJwt } from '../../lib/jwt'

interface Env {
  DB: D1Database
}

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyJwt(request)
  if (!auth) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })
  }

  let body: { session_id?: number; expires_in_hours?: number }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid body' }, { status: 400, headers: CORS })
  }

  const sessionId = body.session_id
  if (!sessionId || typeof sessionId !== 'number') {
    return Response.json({ error: 'Missing session_id' }, { status: 400, headers: CORS })
  }

  // share_expires_at = null means no expiry; otherwise now + hours in unix seconds
  const expiresAt = typeof body.expires_in_hours === 'number' && body.expires_in_hours > 0
    ? Math.floor(Date.now() / 1000) + Math.round(body.expires_in_hours * 3600)
    : null

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
      // Update expiry if requested
      if (body.expires_in_hours !== undefined) {
        await env.DB.prepare(
          'UPDATE sessions SET share_expires_at = ? WHERE id = ?'
        ).bind(expiresAt, sessionId).run()
      }
      return Response.json({ token: session.share_token, share_expires_at: expiresAt }, { status: 200, headers: CORS })
    }

    const token = crypto.randomUUID()
    await env.DB.prepare(
      'UPDATE sessions SET share_token = ?, share_expires_at = ? WHERE id = ?'
    ).bind(token, expiresAt, sessionId).run()

    return Response.json({ token, share_expires_at: expiresAt }, { status: 200, headers: CORS })
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
