import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const service = createServiceClient()
  const { data: invoice } = await service
    .from('invoices')
    .select('id, total, amount_paid, invoice_number, company_id, companies(name, stripe_customer_id)')
    .eq('public_token', token)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const amountDue = Math.round((Number(invoice.total) - Number(invoice.amount_paid)) * 100)
  if (amountDue <= 0) return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 })

  const company = invoice.companies as unknown as { name: string } | null

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountDue,
    currency: 'nzd',
    metadata: { invoice_id: invoice.id, invoice_number: invoice.invoice_number },
    description: `Invoice ${invoice.invoice_number} — ${company?.name ?? ''}`,
  })

  return NextResponse.json({ clientSecret: paymentIntent.client_secret })
}
