/**
 * /api/daily-todos
 * Daily cron that generates each owner/admin's to-do list for the day from
 * the live state of the system (visits today, quotes awaiting follow-up,
 * overdue invoices, fresh enquiries, stalled in-progress jobs).
 *
 * Auth:
 *  - GET  with `Authorization: Bearer <CRON_SECRET>`  (Vercel Cron)
 *  - POST with header `x-cron-secret: <CRON_SECRET>`  (external scheduler)
 *
 * Idempotency:
 *  - Each generated to-do carries (source_type, source_id) so re-running the
 *    cron the same day is safe — existing rows are bumped, not duplicated.
 *  - Pending auto-todos from previous days have their due_date rolled forward
 *    to today so nothing falls off the radar.
 *  - When the underlying artefact is resolved (quote viewed/decided, invoice
 *    paid, visit completed, enquiry quoted/won/lost) the auto-todo is marked
 *    done with `auto_completed_at = now()`.
 */
export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

type SourceType = 'visit_today' | 'quote_followup' | 'invoice_overdue' | 'enquiry_followup' | 'job_stalled'

type Candidate = {
  companyId: string
  assignedTo: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  dueDate: string
  jobId: string | null
  sourceType: SourceType
  sourceId: string
}

export async function POST(req: NextRequest) {
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return run()
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) {
    return run()
  }
  return NextResponse.json({ info: 'Authed GET (Vercel Cron) or POST with x-cron-secret runs the daily to-do generator' })
}

async function run() {
  const svc = createServiceClient()
  const today = new Date().toISOString().slice(0, 10)
  const todayStart = `${today}T00:00:00Z`
  const todayEnd = `${today}T23:59:59Z`
  const created: string[] = []
  const completed: string[] = []

  // ── 1. Auto-complete & roll forward existing auto-todos ──────────────────
  // Walk every pending auto-todo and decide its fate based on the live source.
  const { data: existing } = await svc.from('todos')
    .select('id, company_id, assigned_to, source_type, source_id, due_date')
    .eq('is_auto', true)
    .eq('status', 'pending')

  for (const t of existing ?? []) {
    const stillApplies = await sourceStillApplies(svc, t.source_type as SourceType, t.source_id as string)
    if (!stillApplies) {
      await svc.from('todos').update({ status: 'done', auto_completed_at: new Date().toISOString() }).eq('id', t.id)
      completed.push(`${t.source_type}:${t.source_id}`)
    } else if ((t.due_date as string | null) && (t.due_date as string) < today) {
      // Persist incomplete to today.
      await svc.from('todos').update({ due_date: today }).eq('id', t.id)
    }
  }

  // ── 2. Build candidates from each source ─────────────────────────────────
  const candidates: Candidate[] = []

  // 2a. Today's scheduled visits → todo for the assigned crew member
  const { data: visits } = await svc.from('job_visits')
    .select('id, scheduled_start, assigned_to, status, notes, jobs(id, company_id, job_number, title, customers(name))')
    .gte('scheduled_start', todayStart)
    .lte('scheduled_start', todayEnd)
    .eq('status', 'scheduled')
    .not('assigned_to', 'is', null)
  for (const v of visits ?? []) {
    const job = v.jobs as unknown as { id: string; company_id: string; job_number: string; title: string; customers: { name: string } | null } | null
    if (!job) continue
    const when = new Date(v.scheduled_start as string).toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit', hour12: true })
    candidates.push({
      companyId: job.company_id, assignedTo: v.assigned_to as string,
      title: `Visit ${when}: ${job.customers?.name ?? job.title}`,
      description: `${job.job_number} — ${job.title}${v.notes ? `\n${v.notes}` : ''}`,
      priority: 'high', dueDate: today, jobId: job.id,
      sourceType: 'visit_today', sourceId: v.id as string,
    })
  }

  // 2b. Quote follow-ups due today
  const { data: quotes } = await svc.from('quotes')
    .select('id, company_id, quote_number, title, follow_up_at, assigned_to, created_by, customers(name)')
    .eq('status', 'sent')
    .lte('follow_up_at', new Date().toISOString())
    .is('viewed_at', null)
  for (const q of quotes ?? []) {
    const owner = (q.assigned_to as string | null) ?? (q.created_by as string | null)
    if (!owner) continue
    const cust = q.customers as unknown as { name: string } | null
    candidates.push({
      companyId: q.company_id as string, assignedTo: owner,
      title: `Follow up quote ${q.quote_number}`,
      description: `${cust?.name ?? 'Customer'} — ${q.title ?? 'Quote'} not yet viewed.`,
      priority: 'medium', dueDate: today, jobId: null,
      sourceType: 'quote_followup', sourceId: q.id as string,
    })
  }

  // 2c. Overdue invoices → fall to the company's owners (one to-do per owner+invoice)
  const { data: overdueInvoices } = await svc.from('invoices')
    .select('id, company_id, invoice_number, total, amount_paid, due_date, customers(name)')
    .in('status', ['sent', 'partially_paid', 'overdue'])
    .lt('due_date', today)
  // Pre-load owners per company so we don't N+1 in the loop
  const companyIds = [...new Set((overdueInvoices ?? []).map(i => i.company_id as string))]
  const ownersByCompany: Record<string, string[]> = {}
  if (companyIds.length) {
    const { data: owners } = await svc.from('profiles')
      .select('id, company_id')
      .in('company_id', companyIds).in('role', ['owner', 'admin']).eq('is_active', true)
    for (const o of owners ?? []) {
      (ownersByCompany[o.company_id as string] ||= []).push(o.id as string)
    }
  }
  for (const i of overdueInvoices ?? []) {
    const due = Number(i.total) - Number(i.amount_paid)
    if (due <= 0.01) continue
    const days = Math.floor((Date.now() - new Date(i.due_date as string).getTime()) / 86400000)
    const cust = i.customers as unknown as { name: string } | null
    for (const ownerId of ownersByCompany[i.company_id as string] ?? []) {
      candidates.push({
        companyId: i.company_id as string, assignedTo: ownerId,
        title: `Chase invoice ${i.invoice_number} (${days}d overdue)`,
        description: `${cust?.name ?? 'Customer'} — $${due.toFixed(2)} outstanding.`,
        priority: days > 30 ? 'urgent' : 'high', dueDate: today, jobId: null,
        sourceType: 'invoice_overdue', sourceId: `${i.id}:${ownerId}`,
      })
    }
  }

  // 2d. Enquiry follow-ups (new/contacted with follow_up_at <= today, or 3+ days old uncontacted)
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString()
  const { data: enquiries } = await svc.from('enquiries')
    .select('id, company_id, customer_name, status, follow_up_at, assigned_to, created_at')
    .in('status', ['new', 'contacted'])
    .or(`follow_up_at.lte.${new Date().toISOString()},and(status.eq.new,created_at.lt.${threeDaysAgo})`)
  for (const e of enquiries ?? []) {
    const owner = (e.assigned_to as string | null) ?? ownersByCompany[e.company_id as string]?.[0]
    if (!owner) continue
    candidates.push({
      companyId: e.company_id as string, assignedTo: owner,
      title: `Follow up enquiry: ${e.customer_name}`,
      description: e.status === 'new' ? 'Hasn\'t been contacted yet.' : 'Awaiting response.',
      priority: 'medium', dueDate: today, jobId: null,
      sourceType: 'enquiry_followup', sourceId: e.id as string,
    })
  }

  // 2e. Stalled in-progress jobs (no notes/time/visit in 7+ days)
  const sevenDaysAgoIso = new Date(Date.now() - 7 * 86400000).toISOString()
  const { data: inProgress } = await svc.from('jobs')
    .select('id, company_id, job_number, title, assigned_to, updated_at, status')
    .eq('status', 'in_progress')
    .lt('updated_at', sevenDaysAgoIso)
    .not('assigned_to', 'is', null)
  for (const j of inProgress ?? []) {
    candidates.push({
      companyId: j.company_id as string, assignedTo: j.assigned_to as string,
      title: `Check in on ${j.job_number}`,
      description: `${j.title} — no updates in over a week.`,
      priority: 'low', dueDate: today, jobId: j.id as string,
      sourceType: 'job_stalled', sourceId: j.id as string,
    })
  }

  // ── 3. Upsert candidates ──────────────────────────────────────────────────
  // Partial unique index on (assigned_to, source_type, source_id) handles dupes;
  // we explicitly skip when a non-pending row already exists so we don't
  // resurrect a manually-completed item.
  for (const c of candidates) {
    const { data: existingRow } = await svc.from('todos')
      .select('id, status').eq('assigned_to', c.assignedTo)
      .eq('source_type', c.sourceType).eq('source_id', c.sourceId)
      .eq('is_auto', true).maybeSingle()
    if (existingRow) {
      if (existingRow.status === 'pending') {
        await svc.from('todos').update({ due_date: c.dueDate, priority: c.priority, description: c.description }).eq('id', existingRow.id)
      }
      continue
    }
    const { error } = await svc.from('todos').insert({
      company_id: c.companyId, title: c.title, description: c.description,
      priority: c.priority, status: 'pending',
      assigned_to: c.assignedTo, due_date: c.dueDate,
      job_id: c.jobId, is_auto: true, source_type: c.sourceType, source_id: c.sourceId,
    })
    if (!error) created.push(`${c.sourceType}:${c.sourceId}->${c.assignedTo}`)
  }

  return NextResponse.json({ date: today, created: created.length, completed: completed.length })
}

async function sourceStillApplies(svc: ReturnType<typeof createServiceClient>, source: SourceType, id: string): Promise<boolean> {
  switch (source) {
    case 'visit_today': {
      const { data } = await svc.from('job_visits').select('status, scheduled_start').eq('id', id).maybeSingle()
      if (!data) return false
      const startDate = (data.scheduled_start as string).slice(0, 10)
      // Still relevant if it's today and still scheduled.
      return startDate === new Date().toISOString().slice(0, 10) && data.status === 'scheduled'
    }
    case 'quote_followup': {
      const { data } = await svc.from('quotes').select('status, viewed_at').eq('id', id).maybeSingle()
      return !!data && data.status === 'sent' && data.viewed_at == null
    }
    case 'invoice_overdue': {
      // source_id is `${invoiceId}:${ownerId}` — split it back out.
      const invoiceId = id.includes(':') ? id.split(':')[0] : id
      const { data } = await svc.from('invoices').select('status, total, amount_paid').eq('id', invoiceId).maybeSingle()
      if (!data) return false
      const due = Number(data.total) - Number(data.amount_paid)
      return due > 0.01 && data.status !== 'paid' && data.status !== 'void'
    }
    case 'enquiry_followup': {
      const { data } = await svc.from('enquiries').select('status').eq('id', id).maybeSingle()
      return !!data && (data.status === 'new' || data.status === 'contacted')
    }
    case 'job_stalled': {
      const { data } = await svc.from('jobs').select('status').eq('id', id).maybeSingle()
      return !!data && data.status === 'in_progress'
    }
  }
}
