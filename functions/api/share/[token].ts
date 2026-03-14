import { verifyJwt } from '../../lib/jwt'
import { corsHeaders } from '../../lib/cors'

interface Env {
  DB: D1Database
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const CORS = corsHeaders(request)
  const token = params.token as string

  try {
    const session = await env.DB.prepare(
      `SELECT id, title, started_at, target_lang, line_count, ai_formatted_text, ai_notes_text, share_expires_at
       FROM sessions
       WHERE share_token = ?
         AND (share_expires_at IS NULL OR share_expires_at > unixepoch())`
    ).bind(token).first()

    if (!session) {
      const expired = await env.DB.prepare(
        'SELECT 1 FROM sessions WHERE share_token = ? AND share_expires_at <= unixepoch()'
      ).bind(token).first()
      if (expired) {
        return Response.json({ error: 'Link expired' }, { status: 410, headers: CORS })
      }
      return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
    }

    const [linesResult, highlightsResult] = await Promise.all([
      env.DB.prepare(
        'SELECT line_index, text FROM transcript_lines WHERE session_id = ? ORDER BY line_index ASC'
      ).bind(session.id).all(),
      env.DB.prepare(
        'SELECT id, line_index, text, category FROM session_highlights WHERE session_id = ? ORDER BY created_at ASC'
      ).bind(session.id).all(),
    ])

    return Response.json({ session, lines: linesResult.results, highlights: highlightsResult.results }, { status: 200, headers: CORS })
  } catch (err) {
    console.error('share fetch error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

/** Revoke a share link (auth required — must be workspace owner). */
export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const CORS = corsHeaders(request)
  const auth = await verifyJwt(request)
  if (!auth) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })
  }

  const token = params.token as string

  try {
    const session = await env.DB.prepare(
      'SELECT id, workspace_slug FROM sessions WHERE share_token = ?'
    ).bind(token).first<{ id: number; workspace_slug: string }>()

    if (!session) {
      return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
    }

    if (session.workspace_slug !== auth.workspaceSlug) {
      return Response.json({ error: 'Forbidden' }, { status: 403, headers: CORS })
    }

    await env.DB.prepare(
      'UPDATE sessions SET share_token = NULL, share_expires_at = NULL WHERE id = ?'
    ).bind(session.id).run()

    return Response.json({ ok: true }, { headers: CORS })
  } catch (err) {
    console.error('share revoke error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { status: 204, headers: corsHeaders(request) })
