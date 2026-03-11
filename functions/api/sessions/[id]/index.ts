import { verifyJwt } from '../../../lib/jwt'

interface Env {
  DB: D1Database
}

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await verifyJwt(request)
  if (!auth) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })
  }

  const sessionId = Number(params.id)
  if (!sessionId || isNaN(sessionId)) {
    return Response.json({ error: 'Invalid session id' }, { status: 400, headers: CORS })
  }

  try {
    const session = await env.DB.prepare(
      'SELECT * FROM sessions WHERE id = ?'
    ).bind(sessionId).first()

    if (!session) {
      return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
    }

    if (session.workspace_slug !== auth.workspaceSlug) {
      return Response.json({ error: 'Forbidden' }, { status: 403, headers: CORS })
    }

    const wssSessionId = session.wss_session_id as string | null

    const [linesResult, highlightsResult, speakersResult, shareCommentsResult, viewerCommentsResult] = await Promise.all([
      env.DB.prepare(
        `SELECT line_index, text, offset_ms, end_ms,
                speaker_id, speaker_confidence, speaker_state, speaker_source
         FROM transcript_lines WHERE session_id = ? ORDER BY line_index ASC`
      ).bind(sessionId).all(),
      env.DB.prepare(
        'SELECT id, line_index, text, category, created_at FROM session_highlights WHERE session_id = ? ORDER BY created_at ASC'
      ).bind(sessionId).all(),
      env.DB.prepare(
        'SELECT speaker_id, label, color, source, is_user_edited FROM session_speakers WHERE session_id = ? ORDER BY id ASC'
      ).bind(sessionId).all(),
      env.DB.prepare(
        'SELECT id, line_index, author, body, created_at FROM share_comments WHERE session_id = ? ORDER BY created_at ASC'
      ).bind(sessionId).all(),
      wssSessionId
        ? env.DB.prepare(
            'SELECT id, line_index, author, body, created_at FROM viewer_comments WHERE session_id = ? ORDER BY created_at ASC'
          ).bind(wssSessionId).all()
        : Promise.resolve({ results: [] }),
    ])

    const comments = [...shareCommentsResult.results, ...viewerCommentsResult.results]
      .sort((a, b) => (a as any).created_at - (b as any).created_at)

    return Response.json({
      session,
      lines: linesResult.results,
      highlights: highlightsResult.results,
      speakers: speakersResult.results,
      comments,
    }, { status: 200, headers: CORS })
  } catch (err) {
    console.error('session detail error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await verifyJwt(request)
  if (!auth) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })
  }

  const sessionId = Number(params.id)
  if (!sessionId || isNaN(sessionId)) {
    return Response.json({ error: 'Invalid session id' }, { status: 400, headers: CORS })
  }

  try {
    const session = await env.DB.prepare(
      'SELECT workspace_slug FROM sessions WHERE id = ?'
    ).bind(sessionId).first()

    if (!session) {
      return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
    }

    if (session.workspace_slug !== auth.workspaceSlug) {
      return Response.json({ error: 'Forbidden' }, { status: 403, headers: CORS })
    }

    const body = await request.json<{ title?: string }>()
    const title = body.title?.trim() ?? null

    await env.DB.prepare(
      'UPDATE sessions SET title = ? WHERE id = ?'
    ).bind(title, sessionId).run()

    return Response.json({ ok: true }, { headers: CORS })
  } catch (err) {
    console.error('session patch error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = await verifyJwt(request)
  if (!auth) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })
  }

  const sessionId = Number(params.id)
  if (!sessionId || isNaN(sessionId)) {
    return Response.json({ error: 'Invalid session id' }, { status: 400, headers: CORS })
  }

  try {
    const session = await env.DB.prepare(
      'SELECT workspace_slug FROM sessions WHERE id = ?'
    ).bind(sessionId).first()

    if (!session) {
      return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
    }

    if (session.workspace_slug !== auth.workspaceSlug) {
      return Response.json({ error: 'Forbidden' }, { status: 403, headers: CORS })
    }

    await env.DB.batch([
      env.DB.prepare('DELETE FROM transcript_lines WHERE session_id = ?').bind(sessionId),
      env.DB.prepare('DELETE FROM share_comments WHERE session_id = ?').bind(sessionId),
      env.DB.prepare('DELETE FROM session_highlights WHERE session_id = ?').bind(sessionId),
      env.DB.prepare('DELETE FROM session_speakers WHERE session_id = ?').bind(sessionId),
      env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId),
    ])

    return Response.json({ ok: true }, { headers: CORS })
  } catch (err) {
    console.error('session delete error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
