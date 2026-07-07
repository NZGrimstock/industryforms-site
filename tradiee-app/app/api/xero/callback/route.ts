import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { exchangeXeroCode, getXeroTenants } from '@/lib/xero'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (!code) return NextResponse.redirect(`${appUrl}/settings?xero=error`)

  // The tokens must be stored against whoever is actually signed in right
  // now — never trust a client-supplied `state` param for this (same class
  // of issue fixed in the Google Calendar callback: an attacker could
  // complete their own Xero consent and hit this callback directly with an
  // arbitrary state, planting their own Xero org connection on someone
  // else's company).
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${appUrl}/login`)
  const service = createServiceClient()
  const { data: profile } = await service.from('profiles').select('company_id').eq('id', user.id).single()
  if (!profile) return NextResponse.redirect(`${appUrl}/login`)
  const companyId = profile.company_id

  try {
    const tokens = await exchangeXeroCode(code)
    const tenants = await getXeroTenants(tokens.access_token)
    const tenant = tenants[0]
    if (!tenant) throw new Error('No Xero organisation found')

    await service.from('companies').update({
      xero_tenant_id: tenant.tenantId,
      xero_access_token: tokens.access_token,
      xero_refresh_token: tokens.refresh_token,
      xero_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    }).eq('id', companyId)

    return NextResponse.redirect(`${appUrl}/settings?xero=connected&org=${encodeURIComponent(tenant.tenantName)}`)
  } catch (e) {
    console.error('Xero callback error:', e)
    return NextResponse.redirect(`${appUrl}/settings?xero=error`)
  }
}
