import { verifyJwt } from '../../lib/jwt'
import { corsHeaders } from '../../lib/cors'

interface Env { DB: D1Database }

function generateApiKey(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  const b64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, 'x').replace(/\//g, 'y').replace(/=/g, '')
  return `isol_live_${b64}`
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const CORS = corsHeaders(request)
  const auth = await verifyJwt(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })

  const workspace = await env.DB.prepare(
    'SELECT owner_email FROM workspaces WHERE slug = ?'
  ).bind(auth.workspaceSlug).first<{ owner_email: string }>()

  if (!workspace || workspace.owner_email !== auth.email) {
    return Response.json({ error: 'Only the owner can manage API keys' }, { status: 403, headers: CORS })
  }

  const { action } = await request.json<{ action: 'generate' | 'revoke' }>()

  if (action === 'revoke') {
    await env.DB.prepare('UPDATE workspaces SET api_key = NULL WHERE slug = ?')
      .bind(auth.workspaceSlug).run()
    return Response.json({ api_key: null }, { headers: CORS })
  }

  const apiKey = generateApiKey()
  await env.DB.prepare('UPDATE workspaces SET api_key = ? WHERE slug = ?')
    .bind(apiKey, auth.workspaceSlug).run()
  return Response.json({ api_key: apiKey }, { headers: CORS })
}

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { status: 204, headers: corsHeaders(request) })
