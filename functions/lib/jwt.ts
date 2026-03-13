import { createLocalJWKSet, jwtVerify } from 'jose'

const JWKS_URL = 'https://api.isol.live/auth/.well-known/isol-jwks.json'
const TTL_MS = 3_600_000 // 1 hour

interface JwksCache {
  keys: { keys: unknown[] }
  fetchedAt: number
}

let jwksCache: JwksCache | null = null

async function getJwks() {
  if (jwksCache && Date.now() - jwksCache.fetchedAt < TTL_MS) {
    return createLocalJWKSet(jwksCache.keys as Parameters<typeof createLocalJWKSet>[0])
  }

  try {
    const res = await fetch(JWKS_URL)
    const keys = await res.json() as { keys: unknown[] }
    jwksCache = { keys, fetchedAt: Date.now() }
  } catch {
    // On fetch error, fall back to stale cache to avoid blocking users
    // during temporary lsol-auth downtime
    if (!jwksCache) throw new Error('JWKS fetch failed and no cache available')
  }

  return createLocalJWKSet(jwksCache.keys as Parameters<typeof createLocalJWKSet>[0])
}

/**
 * Verifies a B2B ISOL access token (RS256) issued by lsol-auth.
 * Validates signature, issuer, audience, expiry, and token_use claim.
 * JWKS is fetched from lsol-auth and cached with a 1-hour TTL.
 * On re-fetch failure, stale cache is used as fallback.
 */
export async function verifyJwt(
  request: Request
): Promise<{ email: string; workspaceSlug: string } | null> {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  try {
    const jwks = await getJwks()
    const { payload } = await jwtVerify(token, jwks, {
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
