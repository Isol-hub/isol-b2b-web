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
      'SELECT id FROM sessions WHERE share_token = ?'
    ).bind(token).first<{ id: number }>()

    if (!session) {
      return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
    }

    const result = await env.DB.prepare(
      'SELECT id, line_index, author, body, created_at FROM share_comments WHERE session_id = ? ORDER BY created_at ASC'
    ).bind(session.id).all()

    return Response.json({ comments: result.results }, { status: 200, headers: CORS })
  } catch (err) {
    console.error('comments fetch error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const token = params.token as string

  let body: { line_index?: number | null; author?: string; body?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid body' }, { status: 400, headers: CORS })
  }

  const commentBody = body.body?.trim()
  if (!commentBody) {
    return Response.json({ error: 'Missing body' }, { status: 400, headers: CORS })
  }

  const author = (body.author?.trim() || 'Anonymous').slice(0, 50)
  const lineIndex = typeof body.line_index === 'number' ? body.line_index : null

  try {
    const session = await env.DB.prepare(
      'SELECT id FROM sessions WHERE share_token = ?'
    ).bind(token).first<{ id: number }>()

    if (!session) {
      return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
    }

    const createdAt = Date.now()
    const result = await env.DB.prepare(
      'INSERT INTO share_comments (session_id, line_index, author, body, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(session.id, lineIndex, author, commentBody.slice(0, 1000), createdAt).run()

    return Response.json({
      id: result.meta.last_row_id,
      line_index: lineIndex,
      author,
      body: commentBody.slice(0, 1000),
      created_at: createdAt,
    }, { status: 201, headers: CORS })
  } catch (err) {
    console.error('comment post error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
