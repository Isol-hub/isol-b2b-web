import { verifyJwt } from '../../lib/jwt'

interface Env {
  DB: D1Database
  STRIPE_SECRET_KEY: string
  STRIPE_PRICE_ID_PRO: string
}

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

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

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const auth = await verifyJwt(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })

  try {
    const workspace = await env.DB.prepare(
      'SELECT slug, owner_email, stripe_customer_id, plan FROM workspaces WHERE slug = ?'
    ).bind(auth.workspaceSlug).first<{
      slug: string; owner_email: string; stripe_customer_id: string | null; plan: string
    }>()

    if (!workspace) return Response.json({ error: 'Workspace not found' }, { status: 404, headers: CORS })
    if (workspace.plan === 'pro') return Response.json({ error: 'Already on Pro' }, { status: 400, headers: CORS })

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
      'line_items[0][price]': env.STRIPE_PRICE_ID_PRO,
      'line_items[0][quantity]': '1',
      success_url: `${origin}/${workspace.slug}/settings?billing=success`,
      cancel_url: `${origin}/${workspace.slug}/settings`,
      'subscription_data[metadata][workspace_slug]': workspace.slug,
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

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
