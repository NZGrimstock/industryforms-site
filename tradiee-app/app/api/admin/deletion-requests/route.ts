// POST /api/admin/deletion-requests { id, action: 'verify' | 'reject' | 'complete' }
// Super-admin only. 'complete' deletes the matched auth user (profiles row
// cascades from auth.users) so the person can no longer log in and their
// name/email/phone are gone — company records, invoices, and jobs are
// intentionally retained (legal/tax retention, per privacy.md section 5).
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { logAdminAction } from '@/lib/audit'

const STATUS_FOR_ACTION = { verify: 'verifying', reject: 'rejected', complete: 'completed' } as const

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const service = createServiceClient()
  const { data: profile } = await service.from('profiles').select('is_super_admin').eq('id', user.id).single()
  if (!profile?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, action } = await req.json().catch(() => ({}))
  if (!id || !(action in STATUS_FOR_ACTION)) {
    return NextResponse.json({ error: 'id and a valid action are required' }, { status: 400 })
  }

  const { data: request } = await service.from('account_deletion_requests').select('*').eq('id', id).single()
  if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

  if (action === 'complete' && request.matched_profile_id) {
    const { error: delErr } = await service.auth.admin.deleteUser(request.matched_profile_id)
    if (delErr && delErr.message !== 'User not found') {
      return NextResponse.json({ error: `Could not delete user: ${delErr.message}` }, { status: 500 })
    }
  }

  const status = STATUS_FOR_ACTION[action as keyof typeof STATUS_FOR_ACTION]
  await service.from('account_deletion_requests').update({
    status, reviewed_at: new Date().toISOString(), reviewed_by: user.id,
  }).eq('id', id)

  await logAdminAction(service, {
    adminId: user.id, action: `deletion_request.${action}`, targetType: 'account_deletion_request', targetId: id,
    details: { email: request.email, matched_profile_id: request.matched_profile_id },
  })

  return NextResponse.json({ ok: true, status })
}
