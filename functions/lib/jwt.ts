/**
 * Minimal JWT decode for Cloudflare Pages Functions.
 * Matches client-side getSession() logic in src/lib/auth.ts.
 * No RS256 signature verification — acceptable for early product.
 */
export function decodeJwt(request: Request): { email: string; workspaceSlug: string } | null {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  try {
    const parts = auth.slice(7).split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null
    if (!payload.sub || !payload.wsp) return null
    return { email: payload.sub, workspaceSlug: payload.wsp }
  } catch {
    return null
  }
}
