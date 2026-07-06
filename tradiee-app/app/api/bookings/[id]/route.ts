// PATCH /api/bookings/[id] { action: 'confirm' | 'cancel' | 'no_show' }
// Admin-only manual triage for 'requested' bookings and status changes.
// A refund (if a deposit was paid) is a separate step via /api/bookings/refund
// once the booking is 'cancelled' or 'no_show'.
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createJobFromBooking } from '@/lib/bookings/fulfill'
import { sendBookingConfirmationEmail } from '@/lib/bookings/notify'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { action } = await req.json().catch(() => ({}))
  if (!['confirm', 'cancel', 'no_show'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('company_id, role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'owner' && profile.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const service = createServiceClient()
  const { data: booking } = await service.from('bookings')
    .select('id, company_id, status, customer_id, package_id, assigned_to, customer_email, customer_phone, customer_name, site_address, starts_at, ends_at, job_id')
    .eq('id', id).single()
  if (!booking || booking.company_id !== profile.company_id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (action === 'cancel' || action === 'no_show') {
    const status = action === 'cancel' ? 'cancelled' : 'no_show'
    const { error } = await service.from('bookings').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // confirm
  if (!['requested', 'deposit_pending'].includes(booking.status)) {
    return NextResponse.json({ error: 'Only a requested or deposit-pending booking can be confirmed manually' }, { status: 400 })
  }
  const { error: confirmError } = await service.from('bookings').update({ status: 'confirmed', updated_at: new Date().toISOString() }).eq('id', id)
  if (confirmError) return NextResponse.json({ error: confirmError.message }, { status: 500 })

  const { data: pkg } = await service.from('bookable_packages').select('name, creates_job').eq('id', booking.package_id).single()
  if (!booking.job_id && pkg?.creates_job) {
    await createJobFromBooking(service, booking, pkg.name)
  }
  await sendBookingConfirmationEmail(service, booking.company_id, booking, pkg?.name ?? 'Booking')

  return NextResponse.json({ ok: true })
}
