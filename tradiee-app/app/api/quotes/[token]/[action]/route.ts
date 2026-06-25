import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { nextDocNumber } from '@/lib/numbering'

export async function POST(_req: Request, { params }: { params: Promise<{ token: string; action: string }> }) {
  const { token, action } = await params
  if (!['accept', 'decline'].includes(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  const supabase = createServiceClient()
  const { data: quote } = await supabase
    .from('quotes')
    .select('id, status, title, company_id, customer_id, customer_message')
    .eq('public_token', token)
    .single()

  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!['draft', 'sent'].includes(quote.status)) return NextResponse.json({ error: 'Quote already responded to' }, { status: 409 })

  const updates = action === 'accept'
    ? { status: 'accepted', accepted_at: new Date().toISOString() }
    : { status: 'declined', declined_at: new Date().toISOString() }

  const { error } = await supabase.from('quotes').update(updates).eq('id', quote.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // When customer accepts: auto-create a job + to-do for the team
  if (action === 'accept') {
    try {
      const job_number = await nextDocNumber(supabase, quote.company_id, 'job')
      const { data: job } = await supabase.from('jobs').insert({
        job_number,
        title: quote.title,
        description: quote.customer_message ?? null,
        customer_id: quote.customer_id ?? null,
        company_id: quote.company_id,
        status: 'unscheduled',
        quote_id: quote.id,
      }).select('id').single()

      if (job) {
        await supabase.from('quotes').update({ converted_to_job_id: job.id }).eq('id', quote.id)
        // To-do assigned to nobody (company-wide) so any admin sees it
        await supabase.from('todos').insert({
          company_id: quote.company_id,
          title: `Quote "${quote.title}" accepted by customer — schedule job booking`,
          priority: 'high',
          status: 'pending',
          job_id: job.id,
        })
      }
    } catch {
      // Non-fatal: quote already accepted, job creation is best-effort
    }
  }

  return NextResponse.json({ success: true })
}
