interface AuditEntry {
  db: D1Database
  actor: string
  workspace: string
  action: string
  targetType?: string
  targetId?: string
  meta?: object
}

/**
 * Fire-and-forget audit log insert. Never throws — a logging failure must
 * not block the actual response.
 */
export function logAudit(e: AuditEntry): void {
  e.db.prepare(
    `INSERT INTO audit_log (ts, actor_email, workspace_slug, action, target_type, target_id, meta)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    Date.now(),
    e.actor,
    e.workspace,
    e.action,
    e.targetType ?? null,
    e.targetId ?? null,
    e.meta ? JSON.stringify(e.meta) : null,
  ).run().catch((err: unknown) => {
    console.error(JSON.stringify({ error: (err as Error).message, context: 'audit_log', action: e.action, ts: Date.now() }))
  })
}
