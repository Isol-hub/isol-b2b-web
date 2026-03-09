import { createRemoteJWKSet, jwtVerify } from 'jose'

const JWKS = createRemoteJWKSet(
  new URL('https://api.isol.live/auth/.well-known/isol-jwks.json')
)

/**
 * Verifies a B2B ISOL access token (RS256) issued by lsol-auth.
 * Validates signature, issuer, audience, expiry, and token_use claim.
 * JWKS is fetched from lsol-auth and cached module-scope per Worker instance.
 */
export async function verifyJwt(
  request: Request
): Promise<{ email: string; workspaceSlug: string } | null> {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      algorithms: ['RS256'],
      issuer: 'lsol-auth',
      audience: 'isol-api',
    })
    const sub = payload.sub
    const wsp = payload['wsp']
    if (typeof sub !== 'string' || typeof wsp !== 'string') return null
    if (payload['token_use'] !== 'access') return null
    return { email: sub, workspaceSlug: wsp }
  } catch {
    return null
  }
}
