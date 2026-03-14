import { verifyJwt } from '../../lib/jwt'
import { corsHeaders } from '../../lib/cors'

interface Env {
  DB: D1Database
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const CORS = corsHeaders(request)
  const auth = await verifyJwt(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })

  const url = new URL(request.url)
  const q = url.searchParams.get('q')?.trim()
  const workspaceSlug = url.searchParams.get('workspace_slug') ?? auth.workspaceSlug

  if (workspaceSlug !== auth.workspaceSlug) {
    return Response.json({ error: 'Forbidden' }, { status: 403, headers: CORS })
  }
  if (!q || q.length < 2) {
    return Response.json({ results: [] }, { headers: CORS })
  }

  try {
    const { results } = await env.DB.prepare(`
      SELECT DISTINCT
        s.id AS session_id,
        s.title,
        s.started_at,
        s.target_lang,
        s.line_count,
        s.share_token,
        snippet(sessions_fts, 1, '<b>', '</b>', '…', 10) AS snippet
      FROM sessions_fts
      JOIN sessions s ON CAST(s.id AS TEXT) = sessions_fts.session_id
      WHERE sessions_fts MATCH ?
        AND s.workspace_slug = ?
      ORDER BY s.started_at DESC
      LIMIT 20
    `).bind(q + '*', workspaceSlug).all()

    return Response.json({ results }, { headers: CORS })
  } catch (err) {
    console.error('fts search error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { status: 204, headers: corsHeaders(request) })
