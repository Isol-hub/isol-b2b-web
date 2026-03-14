import { verifyJwt } from '../../../lib/jwt'
import { corsHeaders } from '../../../lib/cors'

interface Env {
  DB: D1Database
}

export const onRequestGet: PagesFunction<Env> = async ({ request, params, env }) => {
  const CORS = corsHeaders(request)
  // AUTH-03: Require authentication — this endpoint exposes share_token
  const auth = await verifyJwt(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })

  const sessionId = params.sessionId as string
  const row = await env.DB.prepare(
    'SELECT share_token, title, workspace_slug FROM sessions WHERE id = ?'
  ).bind(sessionId).first<{ share_token: string | null; title: string | null; workspace_slug: string }>()

  if (!row) return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
  // Ensure the session belongs to the authenticated user's workspace
  if (row.workspace_slug !== auth.workspaceSlug) {
    return Response.json({ error: 'Forbidden' }, { status: 403, headers: CORS })
  }
  return Response.json({ share_token: row.share_token, title: row.title }, { headers: CORS })
}

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { status: 204, headers: corsHeaders(request) })
