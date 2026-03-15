import { verifyJwt } from '../../lib/jwt'
import { corsHeaders } from '../../lib/cors'
import { PLANS } from '../../lib/constants'

interface Env {
  DB: D1Database
  STRIPE_SECRET_KEY: string
  STRIPE_PRICE_ID_PRO: string
  STRIPE_PRICE_ID_PRO_ANNUAL: string
  STRIPE_PRICE_ID_STUDIO: string
  STRIPE_PRICE_ID_STUDIO_ANNUAL: string
  STRIPE_PRICE_ID_TEAM: string
  STRIPE_PRICE_ID_TEAM_ANNUAL: string
}

const PLAN_RANK: Record<string, number> = { [PLANS.FREE]: 0, [PLANS.PRO]: 1, [PLANS.STUDIO]: 2, [PLANS.TEAM]: 3 }

async function stripePost(path: string, params: Record<string, string>, secretKey: string) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params).toString(),
  })
  return res.json() as Promise<Record<string, unknown>>
}

async function stripeGet(path: string, secretKey: string) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  })
  return res.json() as Promise<Record<string, unknown>>
}

function getPriceId(plan: string, annual: boolean, env: Env): string | null {
  if (plan === PLANS.PRO && !annual) return env.STRIPE_PRICE_ID_PRO || null
  if (plan === PLANS.PRO && annual) return env.STRIPE_PRICE_ID_PRO_ANNUAL || null
  if (plan === PLANS.STUDIO && !annual) return env.STRIPE_PRICE_ID_STUDIO || null
  if (plan === PLANS.STUDIO && annual) return env.STRIPE_PRICE_ID_STUDIO_ANNUAL || null
  if (plan === PLANS.TEAM && !annual) return env.STRIPE_PRICE_ID_TEAM || null
  if (plan === PLANS.TEAM && annual) return env.STRIPE_PRICE_ID_TEAM_ANNUAL || null
  return null
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const CORS = corsHeaders(request)
  const auth = await verifyJwt(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })

  try {
    const body = await request.json() as { plan?: string; annual?: boolean }
    const plan = body.plan ?? PLANS.PRO
    const annual = body.annual ?? false

    if (![PLANS.PRO, PLANS.STUDIO, PLANS.TEAM].includes(plan)) {
      return Response.json({ error: 'Invalid plan' }, { status: 400, headers: CORS })
    }

    const priceId = getPriceId(plan, annual, env)
    if (!priceId) {
      return Response.json({ error: 'Plan not available' }, { status: 503, headers: CORS })
    }

    const workspace = await env.DB.prepare(
      'SELECT slug, owner_email, stripe_customer_id, plan FROM workspaces WHERE slug = ?'
    ).bind(auth.workspaceSlug).first<{
      slug: string; owner_email: string; stripe_customer_id: string | null; plan: string
    }>()

    if (!workspace) return Response.json({ error: 'Workspace not found' }, { status: 404, headers: CORS })

    // Don't allow buying same or lower plan
    if ((PLAN_RANK[workspace.plan] ?? 0) >= (PLAN_RANK[plan] ?? 0)) {
      return Response.json({ error: `Already on ${workspace.plan} or higher` }, { status: 400, headers: CORS })
    }

    // Find or create Stripe customer
    let customerId = workspace.stripe_customer_id

    if (!customerId) {
      // Search by email to avoid duplicates
      const searchData = await stripeGet(
        `/customers?email=${encodeURIComponent(workspace.owner_email)}&limit=1`,
        env.STRIPE_SECRET_KEY
      )

      if (searchData.error) {
        console.error('Stripe search error:', JSON.stringify(searchData.error))
        return Response.json({ error: 'Stripe auth failed', detail: (searchData.error as { message?: string }).message }, { status: 500, headers: CORS })
      }

      const list = searchData.data as Array<{ id: string }> | undefined
      if (list && list.length > 0) {
        customerId = list[0].id
      } else {
        const customer = await stripePost('/customers', {
          email: workspace.owner_email,
          'metadata[workspace_slug]': workspace.slug,
        }, env.STRIPE_SECRET_KEY)

        if (customer.error || !customer.id) {
          console.error('Stripe create customer error:', JSON.stringify(customer.error))
          return Response.json({ error: 'Stripe customer failed', detail: (customer.error as { message?: string })?.message }, { status: 500, headers: CORS })
        }
        customerId = customer.id as string
      }

      await env.DB.prepare(
        'UPDATE workspaces SET stripe_customer_id = ? WHERE slug = ?'
      ).bind(customerId, workspace.slug).run()
    }

    // Create checkout session
    const origin = new URL(request.url).origin
    const session = await stripePost('/checkout/sessions', {
      customer: customerId,
      mode: 'subscription',
      'payment_method_types[0]': 'card',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      success_url: `${origin}/${workspace.slug}?billing=success`,
      cancel_url: `${origin}/${workspace.slug}`,
      'subscription_data[metadata][workspace_slug]': workspace.slug,
      'subscription_data[metadata][plan]': plan,
    }, env.STRIPE_SECRET_KEY)

    if (session.error || !session.url) {
      console.error('Stripe checkout error:', JSON.stringify(session.error))
      return Response.json({ error: 'Stripe checkout failed', detail: (session.error as { message?: string })?.message }, { status: 500, headers: CORS })
    }

    return Response.json({ url: session.url }, { headers: CORS })

  } catch (err) {
    console.error('checkout exception:', String(err))
    return Response.json({ error: 'Server error', detail: String(err) }, { status: 500, headers: CORS })
  }
}

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { status: 204, headers: corsHeaders(request) })
