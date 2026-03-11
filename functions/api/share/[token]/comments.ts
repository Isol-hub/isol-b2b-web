import { verifyJwt } from '../../../lib/jwt'

interface Env {
  DB: D1Database
  RESEND_API_KEY: string
  CF_KV_OTP: KVNamespace
}

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const token = params.token as string

  try {
    const session = await env.DB.prepare(
      'SELECT id, wss_session_id FROM sessions WHERE share_token = ?'
    ).bind(token).first<{ id: number; wss_session_id: string | null }>()

    if (!session) {
      return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
    }

    const [shareResult, viewerResult] = await Promise.all([
      env.DB.prepare(
        'SELECT id, line_index, author, body, created_at FROM share_comments WHERE session_id = ? ORDER BY created_at ASC'
      ).bind(session.id).all(),
      session.wss_session_id
        ? env.DB.prepare(
            'SELECT id, line_index, author, body, created_at FROM viewer_comments WHERE session_id = ? ORDER BY created_at ASC'
          ).bind(session.wss_session_id).all()
        : Promise.resolve({ results: [] }),
    ])

    const comments = [...shareResult.results, ...viewerResult.results]
      .sort((a, b) => (a as any).created_at - (b as any).created_at)

    return Response.json({ comments }, { status: 200, headers: CORS })
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

  // If a valid JWT is present, use its email as the author (cannot be spoofed)
  const jwtAuth = await verifyJwt(request)
  const author = (jwtAuth?.email ?? (body.author?.trim() || 'Anonymous')).slice(0, 50)
  const lineIndex = typeof body.line_index === 'number' ? body.line_index : null

  try {
    const session = await env.DB.prepare(
      `SELECT s.id, s.title, s.started_at, w.owner_email
       FROM sessions s
       JOIN workspaces w ON w.slug = s.workspace_slug
       WHERE s.share_token = ?`
    ).bind(token).first<{ id: number; title: string | null; started_at: number; owner_email: string }>()

    if (!session) {
      return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
    }

    const createdAt = Date.now()
    const result = await env.DB.prepare(
      'INSERT INTO share_comments (session_id, line_index, author, body, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(session.id, lineIndex, author, commentBody.slice(0, 1000), createdAt).run()

    // Fire-and-forget email notification — throttled to 1 email per session per hour
    if (env.RESEND_API_KEY && session.owner_email) {
      const kvKey = `notify:share:${session.id}`
      const alreadyNotified = await env.CF_KV_OTP.get(kvKey)
      if (!alreadyNotified) {
        // Set throttle key for 1 hour
        env.CF_KV_OTP.put(kvKey, '1', { expirationTtl: 3600 }).catch(() => {})

        const sessionTitle = session.title
          || `Session — ${new Date(session.started_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
        const shareUrl = `https://isolstudio.live/share/${token}`

        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'ISOL Studio <onboarding@resend.dev>',
            to: [session.owner_email],
            subject: `New comment on "${sessionTitle}"`,
            html: `
              <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:40px 32px;background:#FAFAF8;color:#1C1917;border-radius:14px;border:1px solid rgba(0,0,0,0.07)">
                <div style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;background:#6366F1;border-radius:8px;margin-bottom:24px">
                  <span style="color:#fff;font-weight:800;font-size:18px">i</span>
                </div>
                <h2 style="font-size:18px;font-weight:700;margin:0 0 8px;letter-spacing:-0.01em">${author} left a comment</h2>
                <p style="color:#78716C;font-size:13px;margin:0 0 20px">${sessionTitle}</p>
                <div style="background:#F4F3F0;border-radius:8px;padding:14px 18px;margin-bottom:24px;font-size:14px;line-height:1.6;color:#1C1917">
                  ${commentBody.slice(0, 500)}
                </div>
                <a href="${shareUrl}" style="display:inline-block;background:#6366F1;color:#fff;text-decoration:none;font-weight:600;font-size:13px;padding:10px 20px;border-radius:8px">
                  View transcript →
                </a>
                <div style="margin-top:36px;padding-top:20px;border-top:1px solid rgba(0,0,0,0.07)">
                  <p style="color:#A8A29E;font-size:12px;margin:0">ISOL Studio · You won't receive another email for this session for 1 hour.</p>
                </div>
              </div>
            `,
          }),
        }).catch(err => console.error('comment notify email error', err))
      }
    }

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
