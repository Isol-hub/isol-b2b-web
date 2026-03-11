import { verifyJwt } from '../../lib/jwt'

interface Env {
  DB: D1Database
}

interface TranscriptLineInput {
  index: number
  text: string
  offset_ms?: number | null
  end_ms?: number | null
  speaker_id?: string | null
  speaker_confidence?: number | null
  speaker_state?: string | null
  speaker_source?: string | null
}

interface HighlightInput {
  line_index?: number | null
  text: string
  category?: string | null
}

interface SpeakerInput {
  id: string
  label: string
  color: string
  source: string
  is_user_edited: boolean
}

interface SavePayload {
  workspace_slug: string
  target_lang: string
  started_at: number
  ended_at: number
  transcript_lines: TranscriptLineInput[]
  ai_formatted_text?: string
  highlights?: HighlightInput[]
  speakers?: SpeakerInput[]
  wss_session_id?: string
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

  try {
    const body = await request.json<SavePayload>()
    const { workspace_slug, target_lang, started_at, ended_at, transcript_lines, ai_formatted_text, highlights, speakers, wss_session_id } = body

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
      `INSERT INTO sessions (workspace_slug, target_lang, started_at, ended_at, line_count, ai_formatted_text, wss_session_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      workspace_slug,
      target_lang,
      started_at,
      ended_at,
      transcript_lines.length,
      ai_formatted_text ?? null,
      wss_session_id ?? null
    ).run()

    const sessionId = sessionResult.meta.last_row_id

    // Batch insert transcript lines
    if (transcript_lines.length > 0) {
      const now = Date.now()
      const stmts = transcript_lines.map(line =>
        env.DB.prepare(
          `INSERT INTO transcript_lines
           (session_id, line_index, text, created_at, offset_ms, end_ms,
            speaker_id, speaker_confidence, speaker_state, speaker_source)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          sessionId, line.index, line.text, now,
          line.offset_ms ?? null, line.end_ms ?? null,
          line.speaker_id ?? null, line.speaker_confidence ?? null,
          line.speaker_state ?? null, line.speaker_source ?? null,
        )
      )
      await env.DB.batch(stmts)
    }

    // Batch insert session speakers
    if (speakers && speakers.length > 0) {
      const now = Date.now()
      const spkStmts = speakers.map(s =>
        env.DB.prepare(`
          INSERT INTO session_speakers (session_id, speaker_id, label, color, source, is_user_edited, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (session_id, speaker_id) DO UPDATE SET
            label = excluded.label, color = excluded.color,
            source = excluded.source, is_user_edited = excluded.is_user_edited
        `).bind(sessionId, s.id, s.label, s.color, s.source, s.is_user_edited ? 1 : 0, now)
      )
      await env.DB.batch(spkStmts)
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
