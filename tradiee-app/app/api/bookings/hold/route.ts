// POST /api/bookings/hold — public. Reserves a slot for 10 minutes while the
// visitor fills in their details. Wraps tryHoldSlot(), whose partial unique
// index is the actual concurrency guard (see lib/bookings/availability.ts).
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { tryHoldSlot } from '@/lib/bookings/availability'

export async function POST(req: NextRequest) {
  const { companyId, packageId, profileId, startsAt, endsAt } = await req.json().catch(() => ({}))
  if (!companyId || !packageId || !startsAt || !endsAt) {
    return NextResponse.json({ error: 'companyId, packageId, startsAt, endsAt required' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: pkg } = await service.from('bookable_packages').select('id, is_active')
    .eq('id', packageId).eq('company_id', companyId).single()
  if (!pkg || !pkg.is_active) return NextResponse.json({ error: 'Package not available' }, { status: 404 })

  const result = await tryHoldSlot(service, {
    companyId, packageId, assignedTo: profileId || null, startsAt, endsAt,
  })
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 409 })
  return NextResponse.json({ bookingId: result.id })
}
