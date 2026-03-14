import { getEffectivePlan } from './plan'

export interface RateLimitEnv {
  CF_KV_RL: KVNamespace
  DB: D1Database
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number   // -1 = unlimited
  resetAt: number     // unix seconds, 0 if unlimited
}

/** Daily limits per plan and endpoint. -1 = unlimited. */
const LIMITS: Record<string, Record<string, number>> = {
  free:   { translate: 5000, format: 500, notes: 200, define: 500, title: 300 },
  b2b:    { translate: 5000, format: 500, notes: 200, define: 500, title: 300 },
  pro:    { translate: -1,   format: -1,  notes: -1,  define: -1,  title: -1  },
  studio: { translate: -1,   format: -1,  notes: -1,  define: -1,  title: -1  },
  team:   { translate: -1,   format: -1,  notes: -1,  define: -1,  title: -1  },
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)  // 'YYYY-MM-DD'
}

function monthUTC(): string {
  return new Date().toISOString().slice(0, 7)  // 'YYYY-MM'
}

function secondsUntilMidnightUTC(): number {
  const now = new Date()
  const midnight = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1
  ))
  return Math.max(60, Math.floor((midnight.getTime() - now.getTime()) / 1000))
}

/**
 * Check and increment rate limit counter.
 *
 * @param rateLimitKey  workspace_slug (authenticated) or 'ip:{IP}' (anonymous)
 * @param endpoint      AI endpoint name: translate|format|notes|define|title
 * @param workspaceSlug if provided, look up plan in DB and track ai_usage
 */
export async function checkRateLimit(
  env: RateLimitEnv,
  rateLimitKey: string,
  endpoint: string,
  workspaceSlug?: string
): Promise<RateLimitResult> {
  // Look up plan if we have a workspace
  let plan = 'free'
  if (workspaceSlug) {
    const row = await env.DB.prepare(
      'SELECT plan, plan_expires_at FROM workspaces WHERE slug = ?'
    ).bind(workspaceSlug).first<{ plan: string; plan_expires_at: number | null }>()
    plan = getEffectivePlan(row?.plan ?? 'free', row?.plan_expires_at ?? null)
  }

  const limit = LIMITS[plan]?.[endpoint] ?? LIMITS.free[endpoint] ?? 100

  // Pro / unlimited plans — track usage but skip enforcement
  if (limit === -1) {
    if (workspaceSlug) {
      // Fire-and-forget usage tracking
      env.DB.prepare(
        `INSERT INTO ai_usage (workspace_slug, month, endpoint, count) VALUES (?, ?, ?, 1)
         ON CONFLICT(workspace_slug, month, endpoint) DO UPDATE SET count = count + 1`
      ).bind(workspaceSlug, monthUTC(), endpoint).run().catch((err: unknown) => {
        console.error(JSON.stringify({ error: (err as Error).message, context: 'ai_usage_tracking', ts: Date.now() }))
      })
    }
    return { allowed: true, remaining: -1, resetAt: 0 }
  }

  const kvKey = `rl:${rateLimitKey}:${todayUTC()}:${endpoint}`
  const existing = await env.CF_KV_RL.get(kvKey)
  const count = existing ? parseInt(existing, 10) : 0
  const newCount = count + 1
  const ttl = secondsUntilMidnightUTC()

  // Increment counter (even if over limit — prevents bypass by hammering at boundary)
  await env.CF_KV_RL.put(kvKey, String(newCount), { expirationTtl: ttl })

  // Fire-and-forget usage tracking in D1
  if (workspaceSlug) {
    env.DB.prepare(
      `INSERT INTO ai_usage (workspace_slug, month, endpoint, count) VALUES (?, ?, ?, 1)
       ON CONFLICT(workspace_slug, month, endpoint) DO UPDATE SET count = count + 1`
    ).bind(workspaceSlug, monthUTC(), endpoint).run().catch((err: unknown) => {
        console.error(JSON.stringify({ error: (err as Error).message, context: 'ai_usage_tracking', ts: Date.now() }))
      })
  }

  if (count >= limit) {
    const resetAt = Math.floor(Date.now() / 1000) + ttl
    return { allowed: false, remaining: 0, resetAt }
  }

  return { allowed: true, remaining: limit - newCount, resetAt: 0 }
}
