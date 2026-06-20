import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan } = await req.json()
  const service = createServiceClient()

  const { data: profile } = await service.from('profiles').select('company_id, email, full_name, companies(name, stripe_customer_id)').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const company = profile.companies as unknown as { name: string; stripe_customer_id: string | null } | null
  let stripeCustomerId = company?.stripe_customer_id

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: profile.email,
      name: company?.name ?? profile.full_name,
      metadata: { company_id: profile.company_id },
    })
    stripeCustomerId = customer.id
    await service.from('companies').update({ stripe_customer_id: stripeCustomerId }).eq('id', profile.company_id)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // Price lookup keys: solo_monthly, team_monthly, pro_monthly — set these up in your Stripe dashboard
  const priceKey = `${plan}_monthly`

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [{ price: await getPriceId(priceKey), quantity: 1 }],
    success_url: `${appUrl}/settings?subscribed=1`,
    cancel_url: `${appUrl}/settings`,
    allow_promotion_codes: true,
    subscription_data: { metadata: { company_id: profile.company_id } },
  })

  return NextResponse.json({ url: session.url })
}

async function getPriceId(lookupKey: string): Promise<string> {
  const prices = await getStripe().prices.list({ lookup_keys: [lookupKey], limit: 1 })
  if (!prices.data[0]) throw new Error(`Price not found for key: ${lookupKey}. Create it in Stripe dashboard.`)
  return prices.data[0].id
}
