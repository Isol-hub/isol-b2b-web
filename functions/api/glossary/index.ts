import { verifyJwt } from '../../lib/jwt'
import { assertMaxLen, isValidationError } from '../../lib/validate'

interface Env {
  DB: D1Database
}

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyJwt(request)
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
  const auth = await verifyJwt(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })

  const body = await request.json<{ workspace_slug?: string; term?: string; note?: string }>()
  const workspace_slug = body.workspace_slug ?? auth.workspaceSlug
  const { term, note = null } = body

  if (!term?.trim()) return Response.json({ error: 'term required' }, { status: 400, headers: CORS })
  if (workspace_slug !== auth.workspaceSlug) {
    return Response.json({ error: 'Forbidden' }, { status: 403, headers: CORS })
  }

  try {
    assertMaxLen(term, 'term', 200)
    assertMaxLen(note ?? undefined, 'note', 1_000)
  } catch (err) {
    if (isValidationError(err)) {
      return Response.json({ error: 'Input too long', field: err.field, max: err.max }, { status: 400, headers: CORS })
    }
    throw err
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

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyJwt(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })

  const body = await request.json<{ workspace_slug?: string; term?: string; note?: string | null }>()
  const workspace_slug = body.workspace_slug ?? auth.workspaceSlug
  const { term, note = null } = body

  if (!term?.trim()) return Response.json({ error: 'term required' }, { status: 400, headers: CORS })
  if (workspace_slug !== auth.workspaceSlug) {
    return Response.json({ error: 'Forbidden' }, { status: 403, headers: CORS })
  }

  try {
    assertMaxLen(term, 'term', 200)
    assertMaxLen(note ?? undefined, 'note', 1_000)
  } catch (err) {
    if (isValidationError(err)) {
      return Response.json({ error: 'Input too long', field: err.field, max: err.max }, { status: 400, headers: CORS })
    }
    throw err
  }

  try {
    const result = await env.DB.prepare(
      'UPDATE glossary_terms SET note = ? WHERE workspace_slug = ? AND term = ?'
    ).bind(note ?? null, workspace_slug, term.trim().toLowerCase()).run()

    if (result.meta.changes === 0) {
      return Response.json({ error: 'Term not found' }, { status: 404, headers: CORS })
    }
    return Response.json({ ok: true }, { headers: CORS })
  } catch (err) {
    console.error('glossary patch error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
