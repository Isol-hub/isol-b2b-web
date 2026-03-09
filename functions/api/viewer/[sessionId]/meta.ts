interface Env {
  DB: D1Database
}

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const sessionId = params.sessionId as string
  const row = await env.DB.prepare(
    'SELECT share_token, title FROM sessions WHERE id = ?'
  ).bind(sessionId).first<{ share_token: string | null; title: string | null }>()

  if (!row) return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
  return Response.json({ share_token: row.share_token, title: row.title }, { headers: CORS })
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
