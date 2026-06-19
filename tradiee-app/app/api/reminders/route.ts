import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail, reminderEmailHtml } from '@/lib/email'

// Called by a cron job (e.g. Vercel Cron, pg_cron, or external scheduler)
// Secure with a shared secret header: x-cron-secret
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const sent: string[] = []
  const errors: string[] = []

  // ── Quote follow-ups ─────────────────────────────────────────────────────
  // Sent quotes not viewed/accepted in 3 days, follow_up_at <= now
  const { data: quotesToRemind } = await service
    .from('quotes')
    .select('id, quote_number, title, public_token, subtotal, expires_at, customers(name, email), companies(name, email, phone)')
    .eq('status', 'sent')
    .lte('follow_up_at', new Date().toISOString())
    .is('viewed_at', null)

  for (const quote of quotesToRemind ?? []) {
    const customer = quote.customers as unknown as { name: string; email: string | null } | null
    const company = quote.companies as unknown as { name: string; email: string | null; phone: string | null } | null
    if (!customer?.email || !company) continue

    const { subject, html } = reminderEmailHtml({
      type: 'quote_followup',
      companyName: company.name,
      customerName: customer.name,
      documentNumber: quote.quote_number,
      amountDue: `$${Number(quote.subtotal).toFixed(2)}`,
      viewUrl: `${appUrl}/q/${quote.public_token}`,
    })

    const result = await sendEmail({ to: customer.email, subject, html, replyTo: company.email ?? undefined })
    if (result.error) { errors.push(`Quote ${quote.quote_number}: ${result.error}`) }
    else {
      sent.push(`Quote ${quote.quote_number} to ${customer.email}`)
      // Clear follow_up_at so we don't re-send (push back 7 days)
      await service.from('quotes').update({ follow_up_at: new Date(Date.now() + 7 * 86400000).toISOString() }).eq('id', quote.id)
    }
  }

  // ── Invoice overdue reminders ─────────────────────────────────────────────
  // Invoices that are overdue (due_date < today, not paid)
  const { data: overdueInvoices } = await service
    .from('invoices')
    .select('id, invoice_number, total, amount_paid, public_token, due_date, customers(name, email), companies(name, email, phone)')
    .in('status', ['sent', 'partially_paid', 'overdue'])
    .lt('due_date', new Date().toISOString())

  for (const invoice of overdueInvoices ?? []) {
    const customer = invoice.customers as unknown as { name: string; email: string | null } | null
    const company = invoice.companies as unknown as { name: string; email: string | null; phone: string | null } | null
    if (!customer?.email || !company) continue

    const daysOverdue = Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / 86400000)
    const amountDue = Number(invoice.total) - Number(invoice.amount_paid)

    const { subject, html } = reminderEmailHtml({
      type: 'invoice_overdue',
      companyName: company.name,
      customerName: customer.name,
      documentNumber: invoice.invoice_number,
      amountDue: `$${amountDue.toFixed(2)}`,
      daysOverdue,
      viewUrl: `${appUrl}/i/${invoice.public_token}`,
    })

    const result = await sendEmail({ to: customer.email, subject, html, replyTo: company.email ?? undefined })
    if (result.error) { errors.push(`Invoice ${invoice.invoice_number}: ${result.error}`) }
    else {
      sent.push(`Invoice ${invoice.invoice_number} (${daysOverdue}d overdue) to ${customer.email}`)
      // Mark overdue in DB if not already
      await service.from('invoices').update({ status: 'overdue' }).eq('id', invoice.id).neq('status', 'overdue')
    }
  }

  return NextResponse.json({ sent, errors, total: sent.length })
}

// Manual trigger from admin UI
export async function GET(req: NextRequest) {
  return NextResponse.json({
    info: 'POST to this endpoint with x-cron-secret header to run reminders',
    envVars: {
      CRON_SECRET: !!process.env.CRON_SECRET,
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    },
  })
}
