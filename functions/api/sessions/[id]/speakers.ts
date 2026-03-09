import { verifyJwt } from '../../../lib/jwt'

interface Env {
  DB: D1Database
}

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

async function authedSession(request: Request, env: Env, sessionId: number) {
  const auth = await verifyJwt(request)
  if (!auth) return null
  const session = await env.DB.prepare(
    'SELECT workspace_slug FROM sessions WHERE id = ?'
  ).bind(sessionId).first()
  if (!session || session.workspace_slug !== auth.workspaceSlug) return null
  return auth
}

// PATCH /api/sessions/:id/speakers
// Body: { speaker_id, label?, color? }
// Sets is_user_edited = 1, source = 'manual'.
// Also confirms all lines attributed to this speaker.
export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  const sessionId = Number(params.id)
  if (!sessionId) return Response.json({ error: 'Invalid id' }, { status: 400, headers: CORS })
  const auth = await authedSession(request, env, sessionId)
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403, headers: CORS })

  const body = await request.json<{ speaker_id: string; label?: string; color?: string }>()
  if (!body.speaker_id?.trim()) {
    return Response.json({ error: 'Missing speaker_id' }, { status: 400, headers: CORS })
  }

  const now = Date.now()

  await env.DB.prepare(`
    INSERT INTO session_speakers (session_id, speaker_id, label, color, source, is_user_edited, created_at)
    VALUES (?, ?, ?, ?, 'manual', 1, ?)
    ON CONFLICT (session_id, speaker_id) DO UPDATE SET
      label          = COALESCE(excluded.label, label),
      color          = COALESCE(excluded.color, color),
      source         = 'manual',
      is_user_edited = 1
  `).bind(sessionId, body.speaker_id, body.label ?? null, body.color ?? null, now).run()

  // Confirm all lines attributed to this speaker (manual > heuristic).
  // speaker_confidence = 1.0: a human decision is always maximum confidence.
  await env.DB.prepare(`
    UPDATE transcript_lines
    SET speaker_state      = 'confirmed',
        speaker_source     = 'manual',
        speaker_confidence = 1.0,
        speaker_revision   = speaker_revision + 1
    WHERE session_id = ? AND speaker_id = ? AND COALESCE(speaker_source, '') != 'manual'
  `).bind(sessionId, body.speaker_id).run()

  return Response.json({ ok: true }, { headers: CORS })
}

// GET /api/sessions/:id/speakers — returns all speakers for a session
export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const sessionId = Number(params.id)
  if (!sessionId) return Response.json({ error: 'Invalid id' }, { status: 400, headers: CORS })
  const auth = await authedSession(request, env, sessionId)
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403, headers: CORS })

  const result = await env.DB.prepare(
    'SELECT speaker_id, label, color, source, is_user_edited FROM session_speakers WHERE session_id = ? ORDER BY id ASC'
  ).bind(sessionId).all()

  return Response.json({ speakers: result.results }, { headers: CORS })
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
