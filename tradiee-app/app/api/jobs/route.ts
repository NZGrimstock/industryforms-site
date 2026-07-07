// POST /api/jobs { title, description?, customer_id?, quote_id? }
// Creates a job with a proper auto-generated job_number.
// Used by the mobile app because nextDocNumber() is server-only.
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { nextDocNumber } from '@/lib/numbering'

const bodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).nullish(),
  customer_id: z.string().uuid().nullish(),
  quote_id: z.string().uuid().nullish(),
  status: z.string().min(1).max(50).default('unscheduled'),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  let { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const bearer = req.headers.get('authorization')
    if (bearer?.startsWith('Bearer ')) {
      const { data } = await createServiceClient().auth.getUser(bearer.slice(7))
      user = data.user
    }
  }
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()
  if (!profile?.company_id) return NextResponse.json({ error: 'No company' }, { status: 403 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const { title, description, customer_id, quote_id, status } = parsed.data

  const service = createServiceClient()
  const job_number = await nextDocNumber(service, profile.company_id, 'job')

  const { data: job, error } = await service.from('jobs').insert({
    job_number,
    title,
    description: description ?? null,
    customer_id: customer_id ?? null,
    company_id: profile.company_id,
    assigned_to: user.id,
    status,
    ...(quote_id ? { quote_id } : {}),
  }).select('id, job_number').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If created from a quote, mark it as converted
  if (quote_id) {
    await service.from('quotes').update({ converted_to_job_id: job!.id }).eq('id', quote_id)
  }

  return NextResponse.json(job)
}
