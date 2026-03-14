import { verifyJwt } from '../../lib/jwt'
import { corsHeaders } from '../../lib/cors'

interface Env {
  DB: D1Database
  STRIPE_SECRET_KEY: string
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const CORS = corsHeaders(request)
  const auth = await verifyJwt(request)
  if (!auth) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })

  const workspace = await env.DB.prepare(
    'SELECT stripe_customer_id FROM workspaces WHERE slug = ?'
  ).bind(auth.workspaceSlug).first<{ stripe_customer_id: string | null }>()

  if (!workspace?.stripe_customer_id) {
    return Response.json({ error: 'No billing account found' }, { status: 404, headers: CORS })
  }

  try {
    const origin = new URL(request.url).origin
    const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: workspace.stripe_customer_id,
        return_url: `${origin}/${auth.workspaceSlug}/settings`,
      }).toString(),
    })

    const data = await res.json() as { url: string; error?: { message: string } }
    if (data.error) {
      console.error('Stripe portal error', data.error)
      return Response.json({ error: 'Stripe error' }, { status: 500, headers: CORS })
    }

    return Response.json({ url: data.url }, { headers: CORS })
  } catch (err) {
    console.error('portal error', err)
    return Response.json({ error: 'Server error' }, { status: 500, headers: CORS })
  }
}

export const onRequestOptions: PagesFunction = async ({ request }) =>
  new Response(null, { status: 204, headers: corsHeaders(request) })
