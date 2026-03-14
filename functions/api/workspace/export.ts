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
  const workspaceSlug = url.searchParams.get('workspace_slug') ?? auth.workspaceSlug

  if (workspaceSlug !== auth.workspaceSlug) {
    return Response.json({ error: 'Forbidden' }, { status: 403, headers: CORS })
  }

  try {
    const [workspaceResult, sessionsResult] = await env.DB.batch([
      env.DB.prepare(
        'SELECT slug, owner_email, display_name, default_lang, plan, created_at FROM workspaces WHERE slug = ?'
      ).bind(workspaceSlug),
      env.DB.prepare(
        'SELECT id, started_at, ended_at, target_lang, line_count, title, ai_formatted_text, ai_notes_text FROM sessions WHERE workspace_slug = ? ORDER BY started_at DESC'
      ).bind(workspaceSlug),
    ])

    const workspace = workspaceResult.results[0]
    if (!workspace) return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })

    const sessionIds = (sessionsResult.results as { id: number }[]).map(s => s.id)

    // Fetch lines + highlights for all sessions in batch (up to 50 sessions at a time)
    const sessions: unknown[] = []
    const CHUNK = 50
    for (let i = 0; i < sessionIds.length; i += CHUNK) {
      const chunk = sessionIds.slice(i, i + CHUNK)
      const placeholders = chunk.map(() => '?').join(',')

      const [linesResult, highlightsResult] = await env.DB.batch([
        env.DB.prepare(
          `SELECT session_id, line_index, text, offset_ms FROM transcript_lines WHERE session_id IN (${placeholders}) ORDER BY session_id, line_index`
        ).bind(...chunk),
        env.DB.prepare(
          `SELECT session_id, line_index, text, category FROM session_highlights WHERE session_id IN (${placeholders}) ORDER BY session_id, created_at`
        ).bind(...chunk),
      ])

      type Line = { session_id: number; line_index: number; text: string; offset_ms: number | null }
      type Highlight = { session_id: number; line_index: number | null; text: string; category: string | null }

      const linesBySession = new Map<number, Line[]>()
      const highlightsBySession = new Map<number, Highlight[]>()

      for (const l of linesResult.results as Line[]) {
        const arr = linesBySession.get(l.session_id) ?? []
        arr.push(l)
        linesBySession.set(l.session_id, arr)
      }
      for (const h of highlightsResult.results as Highlight[]) {
        const arr = highlightsBySession.get(h.session_id) ?? []
        arr.push(h)
        highlightsBySession.set(h.session_id, arr)
      }

      for (const session of sessionsResult.results.slice(i, i + CHUNK) as { id: number }[]) {
        sessions.push({
          ...session,
          lines: linesBySession.get(session.id) ?? [],
          highlights: highlightsBySession.get(session.id) ?? [],
        })
      }
    }

    return Response.json({ workspace, sessions }, { headers: CORS })
  } catch (err) {
    console.error('workspace export error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { status: 204, headers: corsHeaders(request) })
