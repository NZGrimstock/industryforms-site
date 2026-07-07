import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const bodySchema = z.object({ token: z.string().trim().min(1).max(200) })

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
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  const { token } = parsed.data

  const serviceClient = createServiceClient()

  // Find invitation
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

  // Try to get authenticated user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Non-platform acceptance: no auth, no subcontractor_company_id
  if (!user && !invitation.subcontractor_company_id) {
    await serviceClient
      .from('job_invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)

    // Notify contractor
    await notifyContractorAccepted(serviceClient, invitation)

    return NextResponse.json({ jobId: null })
  }

  // Auth required beyond this point
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!callerProfile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
  }

  // Non-platform invitation accepted by a logged-in user (shouldn't normally happen but handle gracefully)
  if (!invitation.subcontractor_company_id) {
    await serviceClient
      .from('job_invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)

    await notifyContractorAccepted(serviceClient, invitation)
    return NextResponse.json({ jobId: null })
  }

  // Verify caller belongs to subcontractor company
  if (callerProfile.company_id !== invitation.subcontractor_company_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const subContractorCompanyId = invitation.subcontractor_company_id

  // Generate next job number for subcontractor's company
  const { count } = await serviceClient
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', subContractorCompanyId)

  const jobNumber = `JOB-${String((count ?? 0) + 1).padStart(4, '0')}`

  // Create a new job in the subcontractor's company
  const { data: newJob, error: jobError } = await serviceClient
    .from('jobs')
    .insert({
      company_id: subContractorCompanyId,
      title: invitation.title,
      description: invitation.description ?? null,
      status: 'unscheduled',
      job_number: jobNumber,
    })
    .select('id')
    .single()

  if (jobError || !newJob) {
    console.error('[invitations/accept] job insert error:', jobError?.message)
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }

  // Insert job_links
  const { error: linkError } = await serviceClient
    .from('job_links')
    .insert({
      contractor_job_id: invitation.job_id,
      subcontractor_job_id: newJob.id,
    })

  if (linkError) {
    console.error('[invitations/accept] job_links insert error:', linkError.message)
  }

  // Update invitation status
  await serviceClient
    .from('job_invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  // Notify contractor company
  await notifyContractorAccepted(serviceClient, invitation)

  return NextResponse.json({ jobId: newJob.id })
}

async function notifyContractorAccepted(
  serviceClient: ReturnType<typeof createServiceClient>,
  invitation: { contractor_company_id: string; title: string; token: string }
) {
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
      title: 'Invitation accepted',
      body: `Your invitation for "${invitation.title}" was accepted`,
      data: { screen: 'invitation', token: invitation.token },
    }))

  await sendExpoPush(messages)
}
