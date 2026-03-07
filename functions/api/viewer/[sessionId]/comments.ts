interface Env { DB: D1Database }

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const sessionId = params.sessionId as string
  try {
    const result = await env.DB.prepare(
      'SELECT id, author, body, created_at FROM viewer_comments WHERE session_id = ? ORDER BY created_at ASC'
    ).bind(sessionId).all()
    return Response.json({ comments: result.results }, { status: 200, headers: CORS })
  } catch (err) {
    console.error('viewer comments fetch error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const sessionId = params.sessionId as string
  let body: { author?: string; body?: string }
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid body' }, { status: 400, headers: CORS })
  }
  const commentBody = body.body?.trim()
  if (!commentBody) return Response.json({ error: 'Missing body' }, { status: 400, headers: CORS })
  const author = (body.author?.trim() || 'Anonymous').slice(0, 50)
  const createdAt = Date.now()
  try {
    const result = await env.DB.prepare(
      'INSERT INTO viewer_comments (session_id, author, body, created_at) VALUES (?, ?, ?, ?)'
    ).bind(sessionId, author, commentBody.slice(0, 1000), createdAt).run()
    return Response.json(
      { id: result.meta.last_row_id, author, body: commentBody.slice(0, 1000), created_at: createdAt },
      { status: 201, headers: CORS }
    )
  } catch (err) {
    console.error('viewer comment post error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
