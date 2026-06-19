import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { exchangeXeroCode, getXeroTenants } from '@/lib/xero'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (!code || !state) return NextResponse.redirect(`${appUrl}/settings?xero=error`)

  try {
    const { companyId } = JSON.parse(Buffer.from(state, 'base64url').toString())
    const tokens = await exchangeXeroCode(code)
    const tenants = await getXeroTenants(tokens.access_token)
    const tenant = tenants[0]
    if (!tenant) throw new Error('No Xero organisation found')

    const service = createServiceClient()
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
