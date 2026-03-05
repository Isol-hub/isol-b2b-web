interface Env {
  CF_KV_OTP: KVNamespace
  JWT_SECRET: string
}

async function signJwt(payload: Record<string, unknown>, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const body = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const unsigned = `${header}.${body}`
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(unsigned))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${unsigned}.${sigB64}`
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  try {
    const { email, otp } = await request.json<{ email: string; otp: string }>()
    if (!email || !otp) return Response.json({ error: 'Missing fields' }, { status: 400, headers })

    const emailLower = email.trim().toLowerCase()
    const stored = await env.CF_KV_OTP.get(`otp:${emailLower}`)
    if (!stored) return Response.json({ error: 'Code expired or not found. Request a new one.' }, { status: 401, headers })

    const { otp: validOtp, workspace } = JSON.parse(stored)
    if (otp.trim() !== validOtp) return Response.json({ error: 'Incorrect code. Please try again.' }, { status: 401, headers })

    // Delete OTP after successful use
    await env.CF_KV_OTP.delete(`otp:${emailLower}`)

    const now = Math.floor(Date.now() / 1000)
    const token = await signJwt({
      sub: emailLower,
      wsp: workspace,
      iat: now,
      exp: now + 60 * 60 * 24 * 7, // 7 days
    }, env.JWT_SECRET)

    return Response.json({ token }, { status: 200, headers })
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
