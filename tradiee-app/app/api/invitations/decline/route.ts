import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

type PushMessage = {
  to: string
  title: string
  body: string
  data?: Record<string, string>
}

async function sendExpoPush(messages: PushMessage[]) {
  if (!messages.length) return
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  })
}

export async function POST(request: Request) {
  const body = await request.json() as { token: string }
  const { token } = body

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const serviceClient = createServiceClient()

  const { data: invitation, error: invError } = await serviceClient
    .from('job_invitations')
    .select('*')
    .eq('token', token)
    .single()

  if (invError || !invitation) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }

  if (invitation.status !== 'pending') {
    return NextResponse.json({ error: `Invitation is already ${invitation.status}` }, { status: 409 })
  }

  // Try to get authed user for additional verification
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (callerProfile) {
      const isSubcontractor = callerProfile.company_id === invitation.subcontractor_company_id
      const isContractor = callerProfile.company_id === invitation.contractor_company_id
      if (!isSubcontractor && !isContractor) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
  }
  // If not authed: accept token-based decline (for non-platform users via web link)

  await serviceClient
    .from('job_invitations')
    .update({ status: 'declined', declined_at: new Date().toISOString() })
    .eq('id', invitation.id)

  // Notify contractor company
  const { data: contractorProfiles } = await serviceClient
    .from('profiles')
    .select('expo_push_token')
    .eq('company_id', invitation.contractor_company_id)
    .eq('is_active', true)
    .not('expo_push_token', 'is', null)

  const messages: PushMessage[] = (contractorProfiles ?? [])
    .filter((p): p is { expo_push_token: string } => typeof p.expo_push_token === 'string')
    .map(p => ({
      to: p.expo_push_token,
      title: 'Invitation declined',
      body: `Your invitation for "${invitation.title}" was declined`,
      data: { screen: 'invitation', token: invitation.token },
    }))

  await sendExpoPush(messages)

  return NextResponse.json({ ok: true })
}
