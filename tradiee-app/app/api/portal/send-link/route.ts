import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  // Require authenticated session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { customerId, companyId } = await req.json()
  if (!customerId || !companyId) {
    return NextResponse.json({ error: 'Missing customerId or companyId' }, { status: 400 })
  }

  const service = createServiceClient()

  // Fetch customer
  const { data: customer, error: customerError } = await service
    .from('customers')
    .select('id, name, email, company_id')
    .eq('id', customerId)
    .eq('company_id', companyId)
    .single()

  if (customerError || !customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }
  if (!customer.email) {
    return NextResponse.json({ error: 'Customer has no email address' }, { status: 422 })
  }

  // Fetch company
  const { data: company } = await service
    .from('companies')
    .select('name, email, phone')
    .eq('id', companyId)
    .single()

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  // Delete any existing tokens for this customer, then insert a fresh one
  await service.from('customer_portal_tokens').delete().eq('customer_id', customerId)

  const { data: tokenRow, error: insertError } = await service
    .from('customer_portal_tokens')
    .insert({
      customer_id: customerId,
      company_id: companyId,
      email: customer.email,
    })
    .select('token')
    .single()

  if (insertError || !tokenRow) {
    console.error('Portal token insert error', insertError)
    return NextResponse.json({ error: 'Failed to create portal token' }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const portalUrl = `${appUrl}/portal/${tokenRow.token}`

  const html = portalEmailHtml({
    companyName: company.name,
    customerName: customer.name,
    portalUrl,
    companyPhone: company.phone ?? undefined,
    companyEmail: company.email ?? undefined,
  })

  const { error: emailError } = await sendEmail({
    to: customer.email,
    subject: `View your jobs with ${company.name}`,
    html,
  })

  if (emailError) {
    return NextResponse.json({ error: emailError }, { status: 500 })
  }

  return NextResponse.json({ success: true, email: customer.email })
}

function portalEmailHtml({
  companyName,
  customerName,
  portalUrl,
  companyPhone,
  companyEmail,
}: {
  companyName: string
  customerName: string
  portalUrl: string
  companyPhone?: string
  companyEmail?: string
}) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <div style="background:#f97316;padding:24px 32px">
      <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700">${companyName}</p>
    </div>
    <div style="padding:32px">
      <p style="margin:0 0 16px;font-size:16px;color:#374151">Hi ${customerName},</p>
      <p style="margin:0 0 24px;color:#6b7280">
        You can now view your jobs and invoices with ${companyName} online. Click the button below to open your customer portal.
      </p>
      <a href="${portalUrl}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px">View your jobs &amp; invoices →</a>
      <p style="margin:24px 0 0;font-size:13px;color:#9ca3af">This link is valid for 30 days. If it expires, contact ${companyName} to request a new one.</p>
      <p style="margin:16px 0 0;font-size:13px;color:#9ca3af">
        Questions? Reply to this email${companyPhone ? ` or call ${companyPhone}` : ''}.
      </p>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb">
      <p style="margin:0;font-size:12px;color:#9ca3af">Sent by ${companyName}${companyEmail ? ` · ${companyEmail}` : ''} · Powered by IndustryForms</p>
    </div>
  </div>
</body>
</html>`
}
