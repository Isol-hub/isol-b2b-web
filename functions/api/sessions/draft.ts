import { verifyJwt } from '../../lib/jwt'

interface Env {
  DB: D1Database
}

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

const DRAFT_STALE_SECONDS = 4 * 60 * 60  // 4 hours
const MAX_LINES = 500

/** GET /api/sessions/draft?workspace_slug=X — return latest draft if < 4h old */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyJwt(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })

  const url = new URL(request.url)
  const slug = url.searchParams.get('workspace_slug')
  if (!slug || slug !== auth.workspaceSlug) {
    return Response.json({ error: 'Forbidden' }, { status: 403, headers: CORS })
  }

  try {
    const draft = await env.DB.prepare(
      `SELECT wss_session_id, target_lang, started_at, lines_json, updated_at
       FROM session_drafts
       WHERE workspace_slug = ?
         AND updated_at > unixepoch() - ?`
    ).bind(slug, DRAFT_STALE_SECONDS).first<{
      wss_session_id: string | null
      target_lang: string
      started_at: number
      lines_json: string
      updated_at: number
    }>()

    if (!draft) return Response.json({ draft: null }, { headers: CORS })

    let lines: unknown[]
    try { lines = JSON.parse(draft.lines_json) } catch { lines = [] }

    return Response.json({
      draft: {
        wss_session_id: draft.wss_session_id,
        target_lang: draft.target_lang,
        started_at: draft.started_at,
        lines,
        updated_at: draft.updated_at,
      },
    }, { headers: CORS })
  } catch (err) {
    console.error('draft get error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

/** PUT /api/sessions/draft — upsert draft for workspace */
export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyJwt(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })

  let body: {
    wss_session_id?: string
    target_lang?: string
    started_at?: number
    lines?: unknown[]
  }
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid body' }, { status: 400, headers: CORS })
  }

  if (!body.target_lang || typeof body.started_at !== 'number') {
    return Response.json({ error: 'Missing required fields' }, { status: 400, headers: CORS })
  }

  // Cap lines at MAX_LINES (first 10 + last 490 for context)
  let lines = Array.isArray(body.lines) ? body.lines : []
  if (lines.length > MAX_LINES) {
    lines = [...lines.slice(0, 10), ...lines.slice(-(MAX_LINES - 10))]
  }

  const linesJson = JSON.stringify(lines)
  const now = Math.floor(Date.now() / 1000)

  try {
    await env.DB.prepare(
      `INSERT INTO session_drafts (workspace_slug, wss_session_id, target_lang, started_at, lines_json, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(workspace_slug) DO UPDATE SET
         wss_session_id = excluded.wss_session_id,
         target_lang = excluded.target_lang,
         started_at = excluded.started_at,
         lines_json = excluded.lines_json,
         updated_at = excluded.updated_at`
    ).bind(
      auth.workspaceSlug,
      body.wss_session_id ?? null,
      body.target_lang,
      body.started_at,
      linesJson,
      now,
    ).run()

    return Response.json({ ok: true }, { headers: CORS })
  } catch (err) {
    console.error('draft put error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

/** DELETE /api/sessions/draft — clear draft after successful save */
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyJwt(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })

  try {
    await env.DB.prepare(
      'DELETE FROM session_drafts WHERE workspace_slug = ?'
    ).bind(auth.workspaceSlug).run()

    return Response.json({ ok: true }, { headers: CORS })
  } catch (err) {
    console.error('draft delete error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
