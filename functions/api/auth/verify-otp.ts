interface Env {
  CF_KV_OTP: KVNamespace
  CF_KV_RL: KVNamespace
  B2B_SERVICE_KEY: string
  DB: D1Database
}

import { corsHeaders } from '../../lib/cors'
import { KV_OTP_PREFIX, KV_OTP_FAIL_PREFIX } from '../../lib/constants'

const LSOL_AUTH_URL = 'https://api.isol.live/auth/b2b/token'

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const headers = corsHeaders(request)
  try {
    const { email, otp } = await request.json<{ email: string; otp: string }>()
    if (!email || !otp) return Response.json({ error: 'Missing fields' }, { status: 400, headers })

    const emailLower = email.trim().toLowerCase()

    // AUTH-04: Rate limit OTP verification — max 10 failed attempts per email
    const attemptsKey = `${KV_OTP_FAIL_PREFIX}${emailLower}`
    const attemptsRaw = await env.CF_KV_RL.get(attemptsKey)
    const attempts = attemptsRaw ? parseInt(attemptsRaw, 10) : 0
    if (attempts >= 10) {
      return Response.json({ error: 'Too many attempts. Request a new code.' }, { status: 429, headers })
    }

    const stored = await env.CF_KV_OTP.get(`${KV_OTP_PREFIX}${emailLower}`)
    // AUTH-04: Normalize error messages to prevent email enumeration
    if (!stored) {
      await env.CF_KV_RL.put(attemptsKey, String(attempts + 1), { expirationTtl: 600 })
      return Response.json({ error: 'Invalid code. Request a new one.' }, { status: 401, headers })
    }

    const { otp: validOtp, workspace } = JSON.parse(stored)
    if (otp.trim() !== validOtp) {
      await env.CF_KV_RL.put(attemptsKey, String(attempts + 1), { expirationTtl: 600 })
      return Response.json({ error: 'Invalid code. Request a new one.' }, { status: 401, headers })
    }

    // Success — clear attempt counter
    await env.CF_KV_RL.delete(attemptsKey)

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
    await env.CF_KV_OTP.delete(`${KV_OTP_PREFIX}${emailLower}`)

    // Activate pending team invite if this login was for a team workspace
    await env.DB.prepare(
      "UPDATE workspace_members SET status = 'active', joined_at = ? WHERE member_email = ? AND workspace_slug = ? AND status = 'pending'"
    ).bind(Date.now(), emailLower, workspace).run().catch(() => {})

    return Response.json({ token: access_token }, { status: 200, headers })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal error' }, { status: 500, headers })
  }
}

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { status: 204, headers: corsHeaders(request) })
