import { verifyJwt } from '../../lib/jwt'
import { corsHeaders } from '../../lib/cors'
import { logAudit } from '../../lib/audit'

interface Env { DB: D1Database }

interface Member {
  member_email: string
  role: string
  status: string
  invited_at: number
  joined_at: number | null
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const CORS = corsHeaders(request)
  const auth = await verifyJwt(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })

  const members = await env.DB.prepare(
    'SELECT member_email, role, status, invited_at, joined_at FROM workspace_members WHERE workspace_slug = ? ORDER BY invited_at ASC'
  ).bind(auth.workspaceSlug).all<Member>()

  return Response.json({ members: members.results }, { headers: CORS })
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const CORS = corsHeaders(request)
  const auth = await verifyJwt(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })

  const { member_email } = await request.json<{ member_email: string }>()

  const workspace = await env.DB.prepare(
    'SELECT owner_email FROM workspaces WHERE slug = ?'
  ).bind(auth.workspaceSlug).first<{ owner_email: string }>()

  if (!workspace || workspace.owner_email !== auth.email) {
    return Response.json({ error: 'Only the owner can remove members' }, { status: 403, headers: CORS })
  }
  if (member_email === auth.email) {
    return Response.json({ error: 'Cannot remove yourself' }, { status: 400, headers: CORS })
  }

  await env.DB.prepare(
    'DELETE FROM workspace_members WHERE workspace_slug = ? AND member_email = ?'
  ).bind(auth.workspaceSlug, member_email).run()

  logAudit({ db: env.DB, actor: auth.email, workspace: auth.workspaceSlug, action: 'member.remove', targetType: 'member', targetId: member_email })
  return Response.json({ ok: true }, { headers: CORS })
}

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { status: 204, headers: corsHeaders(request) })
