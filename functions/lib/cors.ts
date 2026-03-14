const ALLOWED_ORIGINS = ['https://isol.studio', 'https://www.isol.studio']

/**
 * Returns CORS + Content-Type headers scoped to the request's Origin.
 * Only isol.studio origins are allowed; any other origin gets the first
 * allowed origin as a fallback (browser will block the mismatch).
 * Also used for OPTIONS preflight responses.
 */
export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') ?? ''
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  }
}
