import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { full_name, email, role, companyId, hourly_bill_rate, hourly_cost_rate } = await request.json()
    if (!full_name || !email || !companyId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const supabase = createServiceClient()
    const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      company_id: companyId,
      full_name,
      email,
      role: role ?? 'staff',
      hourly_bill_rate: hourly_bill_rate ?? null,
      hourly_cost_rate: hourly_cost_rate ?? null,
    })
    if (profileError) {
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    // In production, send a password reset email here so the user sets their own password
    // await supabase.auth.admin.generateLink({ type: 'recovery', email })

    return NextResponse.json({ success: true, tempPassword }) // Return temp pw for dev convenience
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
