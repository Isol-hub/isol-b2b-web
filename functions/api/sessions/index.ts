import { verifyJwt } from '../../lib/jwt'

interface Env {
  DB: D1Database
}

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyJwt(request)
  if (!auth) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })
  }

  const url = new URL(request.url)
  const workspaceSlug = url.searchParams.get('workspace_slug')

  if (!workspaceSlug || workspaceSlug !== auth.workspaceSlug) {
    return Response.json({ error: 'Forbidden' }, { status: 403, headers: CORS })
  }

  try {
    const result = await env.DB.prepare(
      `SELECT id, started_at, ended_at, target_lang, line_count, title, share_token, share_expires_at
       FROM sessions
       WHERE workspace_slug = ?
       ORDER BY started_at DESC
       LIMIT 200`
    ).bind(workspaceSlug).all()

    return Response.json({ sessions: result.results }, { status: 200, headers: CORS })
  } catch (err) {
    console.error('session list error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
