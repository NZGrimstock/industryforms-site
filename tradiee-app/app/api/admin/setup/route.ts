// One-time endpoint to bootstrap the first super-admin account.
// Requires ADMIN_SETUP_SECRET env var to prevent unauthorised use.
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { email, password, secret } = await req.json()
    if (!secret || secret !== process.env.ADMIN_SETUP_SECRET) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!email || !password) {
      return NextResponse.json({ error: 'email and password required' }, { status: 400 })
    }

    const service = createServiceClient()

    // Create or look up the auth user
    const { data: existing } = await service.from('profiles').select('id').eq('email', email).maybeSingle()

    let userId: string
    if (existing) {
      userId = existing.id
    } else {
      const { data: authUser, error: authErr } = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 })
      userId = authUser.user.id

      // Create a minimal company + profile so the user can log in
      const { data: company } = await service.from('companies').insert({
        name: 'IndustryForms Admin',
        country: 'NZ',
      }).select('id').single()

      await service.from('profiles').insert({
        id: userId,
        company_id: company!.id,
        full_name: 'Admin',
        email,
        role: 'admin',
        is_super_admin: true,
      })
    }

    // Ensure is_super_admin = true
    await service.from('profiles').update({ is_super_admin: true }).eq('id', userId)

    return NextResponse.json({ ok: true, userId })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Setup failed' }, { status: 500 })
  }
}
