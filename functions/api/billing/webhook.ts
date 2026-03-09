interface Env {
  DB: D1Database
  STRIPE_WEBHOOK_SECRET: string
}

/** Verify Stripe webhook signature using Web Crypto (no SDK needed) */
async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  const parts = sigHeader.split(',')
  const t = parts.find(p => p.startsWith('t='))?.slice(2)
  const v1 = parts.find(p => p.startsWith('v1='))?.slice(3)
  if (!t || !v1) return false

  // Reject webhooks older than 5 minutes
  if (Math.abs(Date.now() / 1000 - parseInt(t)) > 300) return false

  const signedPayload = `${t}.${payload}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload))
  const computed = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return computed === v1
}

interface StripeSubscription {
  id: string
  status: string
  customer: string
  metadata: Record<string, string>
  current_period_end: number
  items: { data: Array<{ price: { id: string } }> }
}

interface StripeInvoice {
  subscription: string
  customer: string
  status: string
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const sigHeader = request.headers.get('Stripe-Signature')
  if (!sigHeader) return new Response('Missing signature', { status: 400 })

  const body = await request.text()
  const valid = await verifyStripeSignature(body, sigHeader, env.STRIPE_WEBHOOK_SECRET)
  if (!valid) return new Response('Invalid signature', { status: 400 })

  let event: { type: string; data: { object: Record<string, unknown> } }
  try {
    event = JSON.parse(body)
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as unknown as StripeSubscription
        const workspaceSlug = sub.metadata?.workspace_slug
        if (!workspaceSlug) break

        const plan = sub.status === 'active' || sub.status === 'trialing' ? 'pro' : 'free'
        await env.DB.prepare(
          `UPDATE workspaces SET
            plan = ?,
            stripe_subscription_id = ?,
            plan_expires_at = ?
           WHERE slug = ?`
        ).bind(
          plan,
          sub.id,
          plan === 'pro' ? sub.current_period_end : null,
          workspaceSlug
        ).run()
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as unknown as StripeSubscription
        const workspaceSlug = sub.metadata?.workspace_slug
        if (!workspaceSlug) break

        await env.DB.prepare(
          `UPDATE workspaces SET plan = 'free', stripe_subscription_id = NULL, plan_expires_at = NULL
           WHERE slug = ?`
        ).bind(workspaceSlug).run()
        break
      }

      case 'invoice.payment_failed': {
        // Optionally log but don't downgrade yet — Stripe retries before deleting subscription
        const invoice = event.data.object as unknown as StripeInvoice
        console.warn('Payment failed for subscription', invoice.subscription, 'customer', invoice.customer)
        break
      }
    }
  } catch (err) {
    console.error('webhook handler error', err)
    return new Response('Handler error', { status: 500 })
  }

  return new Response('ok', { status: 200 })
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
    },
  })
