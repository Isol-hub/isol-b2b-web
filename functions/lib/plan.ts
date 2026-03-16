import { PLANS, INTERNAL_SLUGS } from './constants'

/**
 * Returns the plan that should actually be enforced, downgrading to 'free'
 * when plan_expires_at has passed. Defends against missed Stripe cancellation
 * webhooks.
 *
 * @param plan          Raw plan value stored in the DB
 * @param planExpiresAt Unix timestamp in seconds (as stored in DB), or null
 * @param slug          Workspace slug — internal/test slugs permanently bypass expiry
 */
export function getEffectivePlan(plan: string, planExpiresAt: number | null, slug?: string): string {
  if (slug && INTERNAL_SLUGS.has(slug)) return plan
  if (plan === PLANS.FREE) return PLANS.FREE
  if (planExpiresAt && planExpiresAt * 1000 < Date.now()) return PLANS.FREE
  return plan
}
