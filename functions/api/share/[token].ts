interface Env {
  DB: D1Database
}

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const token = params.token as string

  try {
    const session = await env.DB.prepare(
      `SELECT id, title, started_at, target_lang, line_count, ai_formatted_text
       FROM sessions WHERE share_token = ?`
    ).bind(token).first()

    if (!session) {
      return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
    }

    const linesResult = await env.DB.prepare(
      'SELECT line_index, text FROM transcript_lines WHERE session_id = ? ORDER BY line_index ASC'
    ).bind(session.id).all()

    return Response.json({ session, lines: linesResult.results }, { status: 200, headers: CORS })
  } catch (err) {
    console.error('share fetch error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
