import { logAudit } from '../../../lib/audit'

interface Env {
  DB: D1Database
  STRIPE_SECRET_KEY: string
  CRON_SECRET: string
}

interface StripeSubscription {
  id: string
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired'
  metadata: Record<string, string>
  current_period_end: number
}

interface WorkspaceRow {
  slug: string
  plan: string
  stripe_subscription_id: string
  plan_expires_at: number | null
}

const VALID_PLANS = ['pro', 'studio', 'team'] as const

async function fetchSubscription(subId: string, secretKey: string): Promise<StripeSubscription | null | 'not_found'> {
  const res = await fetch(`https://api.stripe.com/v1/subscriptions/${subId}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  })
  if (res.status === 404) return 'not_found'
  if (!res.ok) return null
  return res.json() as Promise<StripeSubscription>
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // Auth: must present the shared CRON_SECRET
  const auth = request.headers.get('Authorization')
  if (!env.CRON_SECRET || auth !== `Bearer ${env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const startedAt = Date.now()
  let checked = 0
  let reconciled = 0
  let errors = 0
  const log: string[] = []

  try {
    const { results } = await env.DB.prepare(
      `SELECT slug, plan, stripe_subscription_id, plan_expires_at
       FROM workspaces
       WHERE plan != 'free' AND stripe_subscription_id IS NOT NULL`
    ).all<WorkspaceRow>()

    checked = results.length

    for (const ws of results) {
      try {
        const sub = await fetchSubscription(ws.stripe_subscription_id, env.STRIPE_SECRET_KEY)

        if (sub === 'not_found') {
          // Stripe has no record of this subscription → hard downgrade
          await env.DB.prepare(
            `UPDATE workspaces SET plan = 'free', stripe_subscription_id = NULL, plan_expires_at = NULL WHERE slug = ?`
          ).bind(ws.slug).run()
          logAudit({ db: env.DB, actor: 'cron:reconcile-plans', workspace: ws.slug, action: 'plan.downgrade', targetType: 'workspace', targetId: ws.slug, meta: JSON.stringify({ reason: 'sub_not_found', prev_plan: ws.plan }) })
          log.push(`${ws.slug}: downgraded (sub not found)`)
          reconciled++
          continue
        }

        if (sub === null) {
          log.push(`${ws.slug}: stripe error, skipped`)
          errors++
          continue
        }

        if (
          sub.status === 'canceled' ||
          sub.status === 'unpaid' ||
          sub.status === 'incomplete_expired'
        ) {
          await env.DB.prepare(
            `UPDATE workspaces SET plan = 'free', stripe_subscription_id = NULL, plan_expires_at = NULL WHERE slug = ?`
          ).bind(ws.slug).run()
          logAudit({ db: env.DB, actor: 'cron:reconcile-plans', workspace: ws.slug, action: 'plan.downgrade', targetType: 'workspace', targetId: ws.slug, meta: JSON.stringify({ reason: sub.status, prev_plan: ws.plan }) })
          log.push(`${ws.slug}: downgraded (status: ${sub.status})`)
          reconciled++
          continue
        }

        if (sub.status === 'active' || sub.status === 'trialing') {
          // Resolve plan from metadata (webhook sets it; cron corrects drift)
          const rawPlan = sub.metadata?.plan
          const resolvedPlan = rawPlan && (VALID_PLANS as readonly string[]).includes(rawPlan) ? rawPlan : ws.plan

          const planDrift = resolvedPlan !== ws.plan
          const expiryDrift = ws.plan_expires_at !== sub.current_period_end

          if (planDrift || expiryDrift) {
            await env.DB.prepare(
              `UPDATE workspaces SET plan = ?, plan_expires_at = ? WHERE slug = ?`
            ).bind(resolvedPlan, sub.current_period_end, ws.slug).run()
            logAudit({ db: env.DB, actor: 'cron:reconcile-plans', workspace: ws.slug, action: 'plan.sync', targetType: 'workspace', targetId: ws.slug, meta: JSON.stringify({ plan_drift: planDrift, expiry_drift: expiryDrift, new_plan: resolvedPlan }) })
            log.push(`${ws.slug}: synced (plan: ${ws.plan}→${resolvedPlan}, expiry_drift: ${expiryDrift})`)
            reconciled++
          }
          // past_due: Stripe is retrying payment — don't touch, let Stripe handle it
        }
      } catch (err) {
        console.error(`reconcile-plans: error for ${ws.slug}`, err)
        log.push(`${ws.slug}: exception — ${String(err)}`)
        errors++
      }
    }

    const durationMs = Date.now() - startedAt
    console.log(`reconcile-plans: checked=${checked} reconciled=${reconciled} errors=${errors} ms=${durationMs}`)

    return Response.json({ ok: true, checked, reconciled, errors, log, durationMs })
  } catch (err) {
    console.error('reconcile-plans: fatal error', err)
    return Response.json({ error: 'Server error', detail: String(err) }, { status: 500 })
  }
}
