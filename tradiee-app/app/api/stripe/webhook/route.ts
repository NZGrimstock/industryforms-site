import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { maybeSendReviewRequest } from '@/lib/review-request'
import { setAddonActive } from '@/lib/billing'
import { createJobFromBooking } from '@/lib/bookings/fulfill'
import { sendBookingConfirmationEmail } from '@/lib/bookings/notify'

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  const service = createServiceClient()

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent
      const bookingId = pi.metadata?.booking_id
      if (bookingId) {
        await handleBookingDepositPaid(service, bookingId, pi)
        break
      }
      const invoiceId = pi.metadata?.invoice_id
      if (!invoiceId) break

      const { data: inv } = await service.from('invoices').select('total, amount_paid').eq('id', invoiceId).single()
      if (!inv) break

      const amount = pi.amount / 100
      const newPaid = Number(inv.amount_paid) + amount
      const newStatus = newPaid >= Number(inv.total) ? 'paid' : 'partially_paid'

      await service.from('payments').insert({
        invoice_id: invoiceId,
        amount,
        method: 'stripe',
        notes: `Stripe payment ${pi.id}`,
        paid_at: new Date().toISOString(),
      })

      await service.from('invoices').update({
        amount_paid: newPaid,
        status: newStatus,
        paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
      }).eq('id', invoiceId)

      if (newStatus === 'paid') await maybeSendReviewRequest(service, invoiceId)
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const stripeCustomerId = sub.customer as string
      const status = sub.status

      // The Bookings Website add-on ($19/mo — website builder + bookings) is a
      // separate subscription from the company's main plan.
      if (sub.metadata?.addon === 'bookings_website') {
        const active = status === 'active' || status === 'trialing'
        await setAddonActive(service, sub.metadata.company_id, 'bookings_website', active)
        break
      }

      const plan = (sub.items.data[0]?.price?.lookup_key ?? 'solo').split('_')[0]
      await service.from('companies').update({
        subscription_status: status,
        subscription_plan: plan,
        trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      }).eq('stripe_customer_id', stripeCustomerId)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      if (sub.metadata?.addon === 'bookings_website') {
        await setAddonActive(service, sub.metadata.company_id, 'bookings_website', false)
        break
      }
      await service.from('companies').update({
        subscription_status: 'canceled',
        subscription_plan: 'trial',
      }).eq('stripe_customer_id', sub.customer as string)
      break
    }
  }

  return NextResponse.json({ received: true })
}

// Idempotent under Stripe retries: every write is guarded by the booking's
// current status, so replaying the same event after the first success is a
// no-op (status is no longer 'deposit_pending', job_id is already set).
async function handleBookingDepositPaid(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service: any,
  bookingId: string,
  pi: Stripe.PaymentIntent
) {
  const { data: booking } = await service.from('bookings')
    .select('id, status, company_id, customer_id, package_id, assigned_to, customer_email, customer_phone, customer_name, site_address, starts_at, ends_at, job_id')
    .eq('id', bookingId).single()
  if (!booking || booking.status !== 'deposit_pending') return

  const amount = pi.amount / 100
  await service.from('bookings').update({
    deposit_paid: amount,
    status: 'confirmed',
    updated_at: new Date().toISOString(),
  }).eq('id', bookingId).eq('status', 'deposit_pending')

  const { data: pkg } = await service.from('bookable_packages')
    .select('name, creates_job').eq('id', booking.package_id).single()

  if (!booking.job_id && pkg?.creates_job) {
    await createJobFromBooking(service, booking, pkg.name)
  }

  await sendBookingConfirmationEmail(service, booking.company_id, booking, pkg?.name ?? 'Booking')
}
