import { verifyJwt } from '../../lib/jwt'

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
    const [workspaceResult, statsResult, topLangResult, usageResult] = await env.DB.batch([
      env.DB.prepare(
        'SELECT slug, owner_email, display_name, default_lang, plan, plan_expires_at, api_key FROM workspaces WHERE slug = ?'
      ).bind(workspaceSlug),
      env.DB.prepare(
        'SELECT COUNT(*) as sessions_total, COALESCE(SUM(ended_at - started_at), 0) as total_seconds FROM sessions WHERE workspace_slug = ?'
      ).bind(workspaceSlug),
      env.DB.prepare(
        'SELECT target_lang FROM sessions WHERE workspace_slug = ? GROUP BY target_lang ORDER BY COUNT(*) DESC LIMIT 1'
      ).bind(workspaceSlug),
      env.DB.prepare(
        "SELECT month, endpoint, count FROM ai_usage WHERE workspace_slug = ? AND month >= STRFTIME('%Y-%m', 'now', '-1 month') ORDER BY month DESC, endpoint ASC"
      ).bind(workspaceSlug),
    ])

    let workspace = workspaceResult.results[0]
    if (!workspace) {
      // First login — no workspace row exists yet. Auto-create with defaults so the
      // app is usable immediately without waiting for the first session save.
      await env.DB.prepare(
        'INSERT OR IGNORE INTO workspaces (slug, owner_email, created_at) VALUES (?, ?, ?)'
      ).bind(workspaceSlug, auth.email, Date.now()).run()

      workspace = await env.DB.prepare(
        'SELECT slug, owner_email, display_name, default_lang, plan, plan_expires_at, api_key FROM workspaces WHERE slug = ?'
      ).bind(workspaceSlug).first()

      if (!workspace) {
        return Response.json({ error: 'Not found' }, { status: 404, headers: CORS })
      }

      return Response.json({
        workspace,
        stats: { sessions_total: 0, minutes_total: 0, top_lang: null },
        usage: [],
      }, { headers: CORS })
    }

    const statsRow = statsResult.results[0] as { sessions_total: number; total_seconds: number } | undefined
    const topLangRow = topLangResult.results[0] as { target_lang: string } | undefined

    return Response.json({
      workspace,
      stats: {
        sessions_total: statsRow?.sessions_total ?? 0,
        minutes_total: Math.round((statsRow?.total_seconds ?? 0) / 60000),
        top_lang: topLangRow?.target_lang ?? null,
      },
      usage: usageResult.results,
    }, { headers: CORS })
  } catch (err) {
    console.error('workspace get error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyJwt(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })

  try {
    const body = await request.json<{ display_name?: string; default_lang?: string }>()

    const fields: string[] = []
    const values: (string | null)[] = []

    if ('display_name' in body) {
      fields.push('display_name = ?')
      values.push(body.display_name?.trim() ?? null)
    }
    if ('default_lang' in body && typeof body.default_lang === 'string') {
      fields.push('default_lang = ?')
      values.push(body.default_lang)
    }

    if (fields.length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400, headers: CORS })
    }

    values.push(auth.workspaceSlug)
    await env.DB.prepare(
      `UPDATE workspaces SET ${fields.join(', ')} WHERE slug = ?`
    ).bind(...values).run()

    return Response.json({ ok: true }, { headers: CORS })
  } catch (err) {
    console.error('workspace patch error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyJwt(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })

  const url = new URL(request.url)
  const workspaceSlug = url.searchParams.get('workspace_slug') ?? auth.workspaceSlug

  if (workspaceSlug !== auth.workspaceSlug) {
    return Response.json({ error: 'Forbidden' }, { status: 403, headers: CORS })
  }

  try {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM transcript_lines WHERE session_id IN (SELECT id FROM sessions WHERE workspace_slug = ?)').bind(workspaceSlug),
      env.DB.prepare('DELETE FROM share_comments WHERE session_id IN (SELECT id FROM sessions WHERE workspace_slug = ?)').bind(workspaceSlug),
      env.DB.prepare('DELETE FROM viewer_comments WHERE session_id IN (SELECT id FROM sessions WHERE workspace_slug = ?)').bind(workspaceSlug),
      env.DB.prepare('DELETE FROM session_highlights WHERE session_id IN (SELECT id FROM sessions WHERE workspace_slug = ?)').bind(workspaceSlug),
      env.DB.prepare('DELETE FROM session_speakers WHERE session_id IN (SELECT id FROM sessions WHERE workspace_slug = ?)').bind(workspaceSlug),
      env.DB.prepare('DELETE FROM sessions WHERE workspace_slug = ?').bind(workspaceSlug),
      env.DB.prepare('DELETE FROM glossary_terms WHERE workspace_slug = ?').bind(workspaceSlug),
      env.DB.prepare('DELETE FROM session_drafts WHERE workspace_slug = ?').bind(workspaceSlug),
      env.DB.prepare('DELETE FROM ai_usage WHERE workspace_slug = ?').bind(workspaceSlug),
      env.DB.prepare('DELETE FROM workspaces WHERE slug = ?').bind(workspaceSlug),
    ])
    return Response.json({ ok: true }, { headers: CORS })
  } catch (err) {
    console.error('workspace delete error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
