import { verifyJwt } from '../../lib/jwt'

interface Env { DB: D1Database; RESEND_API_KEY: string }

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

// Total seats per plan (owner counts as 1)
const SEAT_LIMITS: Record<string, number> = { free: 1, pro: 1, studio: 5, team: 20 }

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyJwt(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })

  const { email } = await request.json<{ email: string }>()
  if (!email?.includes('@')) return Response.json({ error: 'Invalid email' }, { status: 400, headers: CORS })
  const emailLower = email.trim().toLowerCase()

  const workspace = await env.DB.prepare(
    'SELECT plan, owner_email, display_name FROM workspaces WHERE slug = ?'
  ).bind(auth.workspaceSlug).first<{ plan: string; owner_email: string; display_name: string | null }>()

  if (!workspace) return Response.json({ error: 'Workspace not found' }, { status: 404, headers: CORS })
  if (workspace.owner_email !== auth.email) return Response.json({ error: 'Only the owner can invite members' }, { status: 403, headers: CORS })
  if (emailLower === auth.email) return Response.json({ error: 'Cannot invite yourself' }, { status: 400, headers: CORS })

  const seatLimit = SEAT_LIMITS[workspace.plan] ?? 1
  const maxMembers = seatLimit - 1 // owner occupies 1 seat and is not in workspace_members

  if (maxMembers <= 0) {
    return Response.json({ error: 'Seat limit reached', code: 'SEAT_LIMIT', limit: seatLimit }, { status: 403, headers: CORS })
  }

  const countRow = await env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM workspace_members WHERE workspace_slug = ? AND status IN ('pending','active')"
  ).bind(auth.workspaceSlug).first<{ cnt: number }>()

  if ((countRow?.cnt ?? 0) >= maxMembers) {
    return Response.json({ error: 'Seat limit reached', code: 'SEAT_LIMIT', limit: seatLimit }, { status: 403, headers: CORS })
  }

  const joinToken = crypto.randomUUID()
  const now = Date.now()

  await env.DB.prepare(
    `INSERT INTO workspace_members (workspace_slug, member_email, role, status, join_token, invited_at)
     VALUES (?, ?, 'member', 'pending', ?, ?)
     ON CONFLICT(workspace_slug, member_email) DO UPDATE SET
       status = 'pending', join_token = excluded.join_token, invited_at = excluded.invited_at`
  ).bind(auth.workspaceSlug, emailLower, joinToken, now).run()

  const workspaceName = workspace.display_name ?? auth.workspaceSlug

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'ISOL <noreply@isol.live>',
      to: [emailLower],
      subject: `You've been invited to join ${workspaceName} on ISOL`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:40px 32px;background:#0a0f1a;color:#f9fafb;border-radius:16px">
          <div style="margin-bottom:28px">
            <span style="font-size:22px;font-weight:800;letter-spacing:-0.03em;color:#fff">ISOL</span>
            <span style="font-size:12px;color:rgba(249,250,251,0.35);margin-left:8px;font-weight:500">Meeting Captions</span>
          </div>
          <h1 style="font-size:22px;font-weight:700;margin:0 0 12px;color:#fff;letter-spacing:-0.02em">
            You're invited to <span style="color:#818cf8">${workspaceName}</span>
          </h1>
          <p style="color:rgba(249,250,251,0.55);font-size:14px;line-height:1.65;margin:0 0 24px">
            <strong style="color:rgba(249,250,251,0.85)">${auth.email}</strong> has invited you to collaborate on ISOL — real-time speech interpretation for professional teams.
          </p>
          <div style="background:rgba(99,102,241,0.10);border:1px solid rgba(99,102,241,0.25);border-radius:10px;padding:18px 20px;margin-bottom:24px">
            <p style="font-size:13px;color:rgba(249,250,251,0.70);margin:0 0 6px;font-weight:600">How to accept</p>
            <p style="font-size:13px;color:rgba(249,250,251,0.55);margin:0;line-height:1.6">
              Log in at <strong style="color:#818cf8">isol.live</strong> with this email address. Your invitation will be detected automatically and you'll be taken directly to the team workspace.
            </p>
          </div>
          <p style="color:rgba(249,250,251,0.25);font-size:11px;margin:0;line-height:1.6">
            If you didn't expect this invitation, ignore this email. No account will be created.
          </p>
        </div>
      `,
    }),
  })

  return Response.json({ ok: true }, { headers: CORS })
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
