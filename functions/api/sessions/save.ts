import { decodeJwt } from '../../lib/jwt'

interface Env {
  DB: D1Database
}

interface TranscriptLineInput {
  index: number
  text: string
  offset_ms?: number | null
}

interface HighlightInput {
  line_index?: number | null
  text: string
  category?: string | null
}

interface SavePayload {
  workspace_slug: string
  target_lang: string
  started_at: number
  ended_at: number
  transcript_lines: TranscriptLineInput[]
  ai_formatted_text?: string
  highlights?: HighlightInput[]
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

  try {
    const body = await request.json<SavePayload>()
    const { workspace_slug, target_lang, started_at, ended_at, transcript_lines, ai_formatted_text, highlights } = body

    if (!workspace_slug || !target_lang || !started_at || !ended_at) {
      return Response.json({ error: 'Missing required fields' }, { status: 400, headers: CORS })
    }

    if (auth.workspaceSlug !== workspace_slug) {
      return Response.json({ error: 'Forbidden' }, { status: 403, headers: CORS })
    }

    // Upsert workspace
    await env.DB.prepare(
      'INSERT OR IGNORE INTO workspaces (slug, owner_email, created_at) VALUES (?, ?, ?)'
    ).bind(workspace_slug, auth.email, Date.now()).run()

    // Insert session
    const sessionResult = await env.DB.prepare(
      `INSERT INTO sessions (workspace_slug, target_lang, started_at, ended_at, line_count, ai_formatted_text)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      workspace_slug,
      target_lang,
      started_at,
      ended_at,
      transcript_lines.length,
      ai_formatted_text ?? null
    ).run()

    const sessionId = sessionResult.meta.last_row_id

    // Batch insert transcript lines
    if (transcript_lines.length > 0) {
      const now = Date.now()
      const stmts = transcript_lines.map(line =>
        env.DB.prepare(
          'INSERT INTO transcript_lines (session_id, line_index, text, created_at, offset_ms) VALUES (?, ?, ?, ?, ?)'
        ).bind(sessionId, line.index, line.text, now, line.offset_ms ?? null)
      )
      await env.DB.batch(stmts)
    }

    // Batch insert highlights
    if (highlights && highlights.length > 0) {
      const now = Date.now()
      const hlStmts = highlights.map(h =>
        env.DB.prepare(
          'INSERT INTO session_highlights (session_id, line_index, text, category, created_at) VALUES (?, ?, ?, ?, ?)'
        ).bind(sessionId, h.line_index ?? null, h.text, h.category ?? null, now)
      )
      await env.DB.batch(hlStmts)
    }

    return Response.json({ session_id: sessionId }, { status: 200, headers: CORS })
  } catch (err) {
    console.error('session save error', err)
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
