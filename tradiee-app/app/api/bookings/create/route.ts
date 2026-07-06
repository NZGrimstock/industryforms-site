// POST /api/bookings/create — public. Finalizes a held booking with visitor
// details: matches/creates the customer, then transitions status per the
// package's rules (auto_confirm -> confirmed + job/visit now; requires_deposit
// -> deposit_pending, awaiting Stripe webhook; else -> requested for manual
// approval).
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createJobFromBooking } from '@/lib/bookings/fulfill'
import { sendBookingConfirmationEmail, sendBookingRequestedEmail } from '@/lib/bookings/notify'

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}
function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '')
}

export async function POST(req: NextRequest) {
  const { bookingId, name, email, phone, siteAddress, notes } = await req.json().catch(() => ({}))
  if (!bookingId || !name || (!email && !phone)) {
    return NextResponse.json({ error: 'Name and a contact detail are required' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: booking } = await service.from('bookings').select('id, company_id, package_id, status, hold_expires_at, assigned_to')
    .eq('id', bookingId).single()
  if (!booking || booking.status !== 'slot_held') {
    return NextResponse.json({ error: 'Booking hold not found or already used' }, { status: 404 })
  }
  if (booking.hold_expires_at && new Date(booking.hold_expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'That hold has expired — please pick a slot again' }, { status: 410 })
  }

  const { data: pkg } = await service.from('bookable_packages')
    .select('name, price, deposit_amount, deposit_percent, requires_deposit, auto_confirm, creates_job')
    .eq('id', booking.package_id).single()
  if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 })

  // Customer matching: normalized email first, then phone. Conflicting
  // matches (email and phone point to different customers) create the
  // booking unmatched and flag it for admin review rather than guessing.
  const normEmail = email ? normalizeEmail(String(email)) : null
  const normPhone = phone ? normalizePhone(String(phone)) : null

  let customerId: string | null = null
  let flaggedForReview = false

  const [{ data: byEmail }, { data: byPhone }] = await Promise.all([
    normEmail
      ? service.from('customers').select('id, phone').eq('company_id', booking.company_id).ilike('email', normEmail).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
    normPhone
      ? service.from('customers').select('id, phone').eq('company_id', booking.company_id).eq('phone', normPhone).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  if (byEmail && byPhone && byEmail.id !== byPhone.id) {
    customerId = byEmail.id
    flaggedForReview = true
  } else if (byEmail) {
    customerId = byEmail.id
  } else if (byPhone) {
    customerId = byPhone.id
  }

  let siteId: string | null = null
  if (!customerId) {
    const { data: newCustomer } = await service.from('customers').insert({
      company_id: booking.company_id,
      name: String(name).slice(0, 200),
      email: normEmail,
      phone: normPhone,
      billing_address: siteAddress ? String(siteAddress).slice(0, 500) : null,
    }).select('id').single()
    customerId = newCustomer?.id ?? null
    if (customerId && siteAddress) {
      const { data: site } = await service.from('customer_sites').insert({
        customer_id: customerId, label: 'Main', address: String(siteAddress).slice(0, 500),
      }).select('id').single()
      siteId = site?.id ?? null
    }
  }
  if (!customerId) return NextResponse.json({ error: 'Could not create customer' }, { status: 500 })

  const depositRequired = pkg.requires_deposit
    ? Number(pkg.deposit_amount ?? 0) || Math.round(Number(pkg.price) * (Number(pkg.deposit_percent ?? 0) / 100) * 100) / 100
    : 0

  const status = pkg.requires_deposit ? 'deposit_pending' : pkg.auto_confirm ? 'confirmed' : 'requested'

  const { data: updated, error } = await service.from('bookings').update({
    customer_id: customerId,
    customer_name: String(name).slice(0, 200),
    customer_email: normEmail,
    customer_phone: normPhone,
    site_address: siteAddress ? String(siteAddress).slice(0, 500) : null,
    notes: notes ? String(notes).slice(0, 2000) : (flaggedForReview ? 'Flagged: email and phone matched different customers — needs admin review.' : null),
    deposit_required: depositRequired,
    status,
    hold_expires_at: null,
    updated_at: new Date().toISOString(),
  }).eq('id', bookingId).eq('status', 'slot_held').select('id, starts_at, ends_at, public_token').single()

  if (error || !updated) return NextResponse.json({ error: 'Could not confirm booking' }, { status: 409 })

  if (status === 'confirmed') {
    if (pkg.creates_job) {
      await createJobFromBooking(service, {
        id: bookingId, company_id: booking.company_id, customer_id: customerId, site_id: siteId,
        assigned_to: booking.assigned_to, starts_at: updated.starts_at, ends_at: updated.ends_at,
      }, pkg.name)
    }
    await sendBookingConfirmationEmail(service, booking.company_id, {
      id: bookingId, customer_email: normEmail, customer_phone: normPhone, customer_name: String(name),
      starts_at: updated.starts_at, site_address: siteAddress ? String(siteAddress) : null,
    }, pkg.name)
  } else if (status === 'requested') {
    await sendBookingRequestedEmail(service, booking.company_id, {
      id: bookingId, customer_email: normEmail, customer_phone: normPhone, customer_name: String(name),
      starts_at: updated.starts_at, site_address: siteAddress ? String(siteAddress) : null,
    }, pkg.name)
  }

  return NextResponse.json({
    bookingId: updated.id,
    publicToken: updated.public_token,
    status,
    depositRequired,
  })
}
