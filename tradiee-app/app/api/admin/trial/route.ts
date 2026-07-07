import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { logAdminAction } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const service = createServiceClient()
  const { data: profile } = await service.from('profiles').select('is_super_admin').eq('id', user.id).single()
  if (!profile?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { companyId, action, days } = await req.json()
  // action: 'extend' | 'reset' | 'end'

  if (action === 'end') {
    await service.from('companies').update({
      subscription_plan: 'trial',
      subscription_status: 'trialing',
      trial_ends_at: new Date().toISOString(),
    }).eq('id', companyId)
    await logAdminAction(service, { adminId: user.id, action: 'trial.end', targetType: 'company', targetId: companyId })
    return NextResponse.json({ ok: true })
  }

  const newEnd = action === 'reset'
    ? new Date(Date.now() + 30 * 86400000)
    : new Date(Date.now() + (days ?? 7) * 86400000)

  await service.from('companies').update({
    subscription_plan: 'trial',
    subscription_status: 'trialing',
    trial_ends_at: newEnd.toISOString(),
  }).eq('id', companyId)

  await logAdminAction(service, {
    adminId: user.id, action: `trial.${action}`, targetType: 'company', targetId: companyId,
    details: { trial_ends_at: newEnd.toISOString(), days: days ?? null },
  })

  return NextResponse.json({ ok: true, trial_ends_at: newEnd.toISOString() })
}
