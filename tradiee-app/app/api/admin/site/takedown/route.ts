// POST /api/admin/site/takedown { companyId, disabled: boolean }
// One-click disable/re-enable for a company's custom-hosted static site.
// Super-admin only. Does not touch the builder-mode site (is_published).

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const service = createServiceClient()
  const { data: profile } = await service.from('profiles').select('is_super_admin').eq('id', user.id).single()
  if (!profile?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { companyId, disabled } = await req.json()
  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 })

  const { error } = await service.from('company_websites')
    .update({ custom_site_status: disabled ? 'disabled' : 'active' })
    .eq('company_id', companyId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
