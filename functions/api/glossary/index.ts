import { decodeJwt } from '../../lib/jwt'

interface Env {
  DB: D1Database
}

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = decodeJwt(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })

  const url = new URL(request.url)
  const workspaceSlug = url.searchParams.get('workspace_slug') ?? auth.workspaceSlug

  if (workspaceSlug !== auth.workspaceSlug) {
    return Response.json({ error: 'Forbidden' }, { status: 403, headers: CORS })
  }

  try {
    const { results } = await env.DB.prepare(
      'SELECT id, term, note, added_at FROM glossary_terms WHERE workspace_slug = ? ORDER BY added_at DESC'
    ).bind(workspaceSlug).all()

    return Response.json({ terms: results }, { headers: CORS })
  } catch (err) {
    console.error('glossary list error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = decodeJwt(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })

  const body = await request.json<{ workspace_slug?: string; term?: string; note?: string }>()
  const workspace_slug = body.workspace_slug ?? auth.workspaceSlug
  const { term, note = null } = body

  if (!term?.trim()) return Response.json({ error: 'term required' }, { status: 400, headers: CORS })
  if (workspace_slug !== auth.workspaceSlug) {
    return Response.json({ error: 'Forbidden' }, { status: 403, headers: CORS })
  }

  try {
    await env.DB.prepare(
      `INSERT INTO glossary_terms (workspace_slug, term, note, added_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(workspace_slug, term) DO UPDATE SET note = excluded.note, added_at = excluded.added_at`
    ).bind(workspace_slug, term.trim().toLowerCase(), note, Date.now()).run()

    return Response.json({ ok: true }, { headers: CORS })
  } catch (err) {
    console.error('glossary save error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
