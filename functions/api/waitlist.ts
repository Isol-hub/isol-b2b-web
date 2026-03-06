interface Env {
  DB: D1Database
}

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const { email } = await request.json<{ email?: string }>()
    if (!email || !email.includes('@') || email.length > 254) {
      return Response.json({ error: 'Invalid email' }, { status: 400, headers: CORS })
    }

    await env.DB.prepare(
      'INSERT OR IGNORE INTO waitlist (email, created_at, source) VALUES (?, ?, ?)'
    ).bind(email.trim().toLowerCase(), Date.now(), 'landing').run()

    return Response.json({ ok: true }, { status: 200, headers: CORS })
  } catch (err) {
    console.error('waitlist error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
