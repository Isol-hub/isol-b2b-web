interface Env {
  DB: D1Database
  RESEND_API_KEY: string
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

    const emailLower = email.trim().toLowerCase()

    const result = await env.DB.prepare(
      'INSERT OR IGNORE INTO waitlist (email, created_at, source) VALUES (?, ?, ?)'
    ).bind(emailLower, Date.now(), 'landing').run()

    // Send confirmation email only for new signups — fire-and-forget, never fail the response
    if (result.meta.changes > 0 && env.RESEND_API_KEY) {
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'ISOL Studio <onboarding@resend.dev>',
          to: [emailLower],
          subject: "You're on the ISOL Studio waitlist",
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:40px 32px;background:#FAFAF8;color:#1C1917;border-radius:14px;border:1px solid rgba(0,0,0,0.07)">
              <div style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;background:#6366F1;border-radius:8px;margin-bottom:24px">
                <span style="color:#fff;font-weight:800;font-size:18px">i</span>
              </div>
              <h1 style="font-size:22px;font-weight:700;margin:0 0 10px;letter-spacing:-0.02em;color:#1C1917">You're on the list.</h1>
              <p style="color:#78716C;font-size:14px;line-height:1.7;margin:0 0 20px">
                Thanks for signing up for early access to ISOL Studio — live speech transcription, translation, and AI document structuring for professionals.
              </p>
              <p style="color:#78716C;font-size:14px;line-height:1.7;margin:0">
                We'll reach out when a spot opens up. In the meantime, reply to this email if you have any questions.
              </p>
              <div style="margin-top:36px;padding-top:20px;border-top:1px solid rgba(0,0,0,0.07)">
                <p style="color:#A8A29E;font-size:12px;margin:0">ISOL Studio</p>
              </div>
            </div>
          `,
        }),
      }).catch(err => console.error('waitlist email send error', err))
    }

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
