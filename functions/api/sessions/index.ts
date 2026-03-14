import { verifyJwt } from '../../lib/jwt'
import { corsHeaders } from '../../lib/cors'

interface Env {
  DB: D1Database
}

const PAGE_SIZE = 50

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const CORS = corsHeaders(request)
  const auth = await verifyJwt(request)
  if (!auth) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })
  }

  const url = new URL(request.url)
  const workspaceSlug = url.searchParams.get('workspace_slug')

  if (!workspaceSlug || workspaceSlug !== auth.workspaceSlug) {
    return Response.json({ error: 'Forbidden' }, { status: 403, headers: CORS })
  }

  const beforeIdParam = url.searchParams.get('before_id')
  const beforeId = beforeIdParam ? parseInt(beforeIdParam, 10) : null

  try {
    const stmt = beforeId
      ? env.DB.prepare(
          `SELECT id, started_at, ended_at, target_lang, line_count, title, share_token, share_expires_at
           FROM sessions
           WHERE workspace_slug = ? AND id < ?
           ORDER BY started_at DESC
           LIMIT ${PAGE_SIZE}`
        ).bind(workspaceSlug, beforeId)
      : env.DB.prepare(
          `SELECT id, started_at, ended_at, target_lang, line_count, title, share_token, share_expires_at
           FROM sessions
           WHERE workspace_slug = ?
           ORDER BY started_at DESC
           LIMIT ${PAGE_SIZE}`
        ).bind(workspaceSlug)

    const result = await stmt.all()
    const sessions = result.results
    const next_cursor = sessions.length === PAGE_SIZE
      ? (sessions[sessions.length - 1] as { id: number }).id
      : null

    return Response.json({ sessions, next_cursor }, { status: 200, headers: CORS })
  } catch (err) {
    console.error('session list error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { status: 204, headers: corsHeaders(request) })
