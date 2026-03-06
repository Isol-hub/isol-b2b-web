import { decodeJwt } from '../../lib/jwt'

interface Env {
  DB: D1Database
}

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const auth = decodeJwt(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })

  const term = decodeURIComponent(params.term as string).toLowerCase()
  const url = new URL(request.url)
  const workspaceSlug = url.searchParams.get('workspace_slug') ?? auth.workspaceSlug

  if (workspaceSlug !== auth.workspaceSlug) {
    return Response.json({ error: 'Forbidden' }, { status: 403, headers: CORS })
  }

  try {
    await env.DB.prepare(
      'DELETE FROM glossary_terms WHERE workspace_slug = ? AND term = ?'
    ).bind(workspaceSlug, term).run()

    return Response.json({ ok: true }, { headers: CORS })
  } catch (err) {
    console.error('glossary delete error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
