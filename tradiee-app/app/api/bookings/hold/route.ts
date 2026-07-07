// POST /api/bookings/hold — public. Reserves a slot for 10 minutes while the
// visitor fills in their details. Wraps tryHoldSlot(), whose partial unique
// index is the actual concurrency guard (see lib/bookings/availability.ts).
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { tryHoldSlot } from '@/lib/bookings/availability'

const bodySchema = z.object({
  companyId: z.string().uuid(),
  packageId: z.string().uuid(),
  profileId: z.string().uuid().nullish(),
  startsAt: z.string().datetime({ offset: true }).or(z.string().datetime()),
  endsAt: z.string().datetime({ offset: true }).or(z.string().datetime()),
})

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'companyId, packageId, startsAt, endsAt required' }, { status: 400 })
  }
  const { companyId, packageId, profileId, startsAt, endsAt } = parsed.data

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
