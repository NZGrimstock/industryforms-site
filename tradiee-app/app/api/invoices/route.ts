// POST /api/invoices { job_id }
// Creates a draft invoice from a job's materials (for mobile "Complete and Invoice" flow).
// If the job has no materials, creates an empty draft invoice.
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { nextDocNumber } from '@/lib/numbering'

const bodySchema = z.object({ job_id: z.string().uuid() })

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
  if (!parsed.success) return NextResponse.json({ error: 'job_id required' }, { status: 400 })
  const { job_id } = parsed.data

  const service = createServiceClient()

  // Verify job belongs to this company
  const { data: job } = await service
    .from('jobs')
    .select('id, customer_id, company_id, title')
    .eq('id', job_id)
    .single()
  if (!job || job.company_id !== profile.company_id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Fetch materials to use as invoice line items
  const { data: materials } = await service
    .from('job_materials')
    .select('description, quantity, unit, unit_price')
    .eq('job_id', job_id)
    .order('rowid')

  const { data: co } = await service
    .from('companies')
    .select('default_gst_rate')
    .eq('id', profile.company_id)
    .single()
  const gstRate = Number(co?.default_gst_rate ?? 0.15)

  const lines = materials ?? []
  const subtotal = lines.reduce((s, m) => s + Number(m.quantity) * Number(m.unit_price), 0)
  const gst = subtotal * gstRate
  const total = subtotal + gst

  const invoice_number = await nextDocNumber(service, profile.company_id, 'invoice')

  const { data: inv, error } = await service.from('invoices').insert({
    company_id: profile.company_id,
    customer_id: job.customer_id,
    job_id,
    invoice_number,
    status: 'draft',
    invoice_date: new Date().toISOString().slice(0, 10),
    subtotal,
    gst_amount: gst,
    total,
    amount_paid: 0,
  }).select('id, invoice_number').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (lines.length > 0) {
    await service.from('invoice_line_items').insert(
      lines.map((m, idx) => ({
        invoice_id: inv!.id,
        type: 'labour' as const,
        description: m.description,
        quantity: Number(m.quantity),
        unit: m.unit ?? 'ea',
        unit_price: Number(m.unit_price),
        line_total: Number(m.quantity) * Number(m.unit_price),
        sort_order: idx,
      }))
    )
  }

  return NextResponse.json(inv)
}
