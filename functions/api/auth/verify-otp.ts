interface Env {
  CF_KV_OTP: KVNamespace
  B2B_SERVICE_KEY: string
}

const LSOL_AUTH_URL = 'https://api.isol.live/auth/b2b/token'

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

    // Exchange verified identity for ISOL RS256 token via lsol-auth
    const authRes = await fetch(LSOL_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailLower, workspace, service_key: env.B2B_SERVICE_KEY }),
    })
    if (!authRes.ok) {
      const err = await authRes.text()
      console.error('lsol-auth error:', err)
      return Response.json({ error: 'Auth service error. Try again.' }, { status: 502, headers })
    }
    const { access_token } = await authRes.json<{ access_token: string }>()

    // Delete OTP only after successful token issuance
    await env.CF_KV_OTP.delete(`otp:${emailLower}`)

    return Response.json({ token: access_token }, { status: 200, headers })
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
