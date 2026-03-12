interface Env {
  CF_KV_OTP: KVNamespace
  RESEND_API_KEY: string
  ALLOWED_EMAIL_DOMAINS?: string  // comma-separated, or * for any
  DB: D1Database
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function slugFromEmail(email: string): string {
  return email.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

function isEmailAllowed(email: string, allowed?: string): boolean {
  if (!allowed || allowed === '*') return true
  const domain = email.split('@')[1] ?? ''
  return allowed.split(',').map(d => d.trim()).includes(domain)
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  }
  try {
    const { email } = await request.json<{ email: string }>()
    if (!email || !email.includes('@')) {
      return Response.json({ error: 'Invalid email' }, { status: 400, headers })
    }
    const emailLower = email.trim().toLowerCase()
    if (!isEmailAllowed(emailLower, env.ALLOWED_EMAIL_DOMAINS)) {
      return Response.json({ error: 'Email domain not authorized for this workspace' }, { status: 403, headers })
    }

    const otp = generateOtp()

    // If the email has a pending team invite, route them to the inviting workspace
    let workspace = slugFromEmail(emailLower)
    const invite = await env.DB.prepare(
      "SELECT workspace_slug FROM workspace_members WHERE member_email = ? AND status = 'pending' LIMIT 1"
    ).bind(emailLower).first<{ workspace_slug: string }>().catch(() => null)
    if (invite) workspace = invite.workspace_slug

    // Store OTP in KV with 10-minute TTL
    await env.CF_KV_OTP.put(
      `otp:${emailLower}`,
      JSON.stringify({ otp, workspace }),
      { expirationTtl: 600 }
    )

    // Send email via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ISOL <noreply@isol.live>',
        to: [emailLower],
        subject: `Your ISOL login code: ${otp}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:440px;margin:0 auto;padding:32px;background:#0a0f1a;color:#f9fafb;border-radius:14px">
            <h1 style="font-size:20px;margin-bottom:8px">ISOL Meeting Captions</h1>
            <p style="color:rgba(249,250,251,0.6);font-size:14px;margin-bottom:28px">Your one-time login code:</p>
            <div style="background:#111827;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:20px 28px;text-align:center;font-size:36px;font-weight:700;letter-spacing:0.2em;color:#1AD2FF">
              ${otp}
            </div>
            <p style="color:rgba(249,250,251,0.4);font-size:12px;margin-top:20px">Valid for 10 minutes. Do not share this code.</p>
          </div>
        `,
      }),
    })
    if (!emailRes.ok) {
      const err = await emailRes.text()
      console.error('Resend error:', err)
      return Response.json({ error: 'Failed to send email. Try again.' }, { status: 500, headers })
    }

    return Response.json({ ok: true }, { status: 200, headers })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal error' }, { status: 500, headers })
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
