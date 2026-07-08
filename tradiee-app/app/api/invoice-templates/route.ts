import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { nextDocNumber } from '@/lib/numbering'

const saveSchema = z.object({
  action: z.literal('save').optional(),
  invoiceId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
})

const createSchema = z.object({
  action: z.literal('create_invoice'),
  templateId: z.string().uuid(),
  customerId: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: profile } = await service.from('profiles').select('company_id, role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (profile.role !== 'owner' && profile.role !== 'admin') {
    return NextResponse.json({ error: 'Only owners or admins can manage invoice templates.' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const createParsed = createSchema.safeParse(body)
  if (createParsed.success) return createInvoiceFromTemplate(service, profile.company_id, createParsed.data.templateId, createParsed.data.customerId)

  const saveParsed = saveSchema.safeParse(body)
  if (!saveParsed.success) return NextResponse.json({ error: 'Invalid template request' }, { status: 400 })
  return saveInvoiceTemplate(service, profile.company_id, saveParsed.data.invoiceId, saveParsed.data.name)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function saveInvoiceTemplate(service: any, companyId: string, invoiceId: string, name: string) {
  const { data: invoice } = await service
    .from('invoices')
    .select('id, company_id, terms, invoice_line_items(*)')
    .eq('id', invoiceId)
    .eq('company_id', companyId)
    .single()
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const lines = [...(invoice.invoice_line_items ?? [])]
    .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
    .map(line => ({
      price_list_item_id: line.price_list_item_id,
      type: line.type,
      description: line.description,
      quantity: Number(line.quantity ?? 1),
      unit: line.unit ?? 'each',
      unit_price: Number(line.unit_price ?? 0),
      discount_type: line.discount_type ?? null,
      discount_value: Number(line.discount_value ?? 0),
      tax_rate: line.tax_rate != null ? Number(line.tax_rate) : null,
      line_total: Number(line.line_total ?? 0),
    }))

  const { error } = await service.from('document_templates').insert({
    company_id: companyId,
    kind: 'invoice',
    name: name.trim(),
    data: { terms: invoice.terms ?? null, lines },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createInvoiceFromTemplate(service: any, companyId: string, templateId: string, customerId: string) {
  const [{ data: template }, { data: customer }, { data: company }] = await Promise.all([
    service.from('document_templates').select('id, data').eq('id', templateId).eq('company_id', companyId).eq('kind', 'invoice').single(),
    service.from('customers').select('id').eq('id', customerId).eq('company_id', companyId).single(),
    service.from('companies').select('default_gst_rate').eq('id', companyId).single(),
  ])
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  const data = template.data as { terms?: string | null; lines?: Array<Record<string, unknown>> }
  const lines = data.lines ?? []
  const gstRate = Number(company?.default_gst_rate ?? 0.15)
  const subtotal = lines.reduce((sum, line) => sum + Number(line.line_total ?? 0), 0)
  const gst = lines.reduce((sum, line) => sum + Number(line.line_total ?? 0) * Number(line.tax_rate ?? gstRate), 0)
  const invoiceNumber = await nextDocNumber(service, companyId, 'invoice')

  const { data: invoice, error } = await service.from('invoices').insert({
    company_id: companyId,
    customer_id: customerId,
    invoice_number: invoiceNumber,
    status: 'draft',
    invoice_date: new Date().toISOString().slice(0, 10),
    subtotal,
    gst_amount: gst,
    total: subtotal + gst,
    amount_paid: 0,
    terms: data.terms ?? null,
  }).select('id').single()
  if (error || !invoice) return NextResponse.json({ error: error?.message ?? 'Failed to create invoice' }, { status: 500 })

  if (lines.length) {
    const { error: lineError } = await service.from('invoice_line_items').insert(lines.map((line, index) => ({
      invoice_id: invoice.id,
      price_list_item_id: line.price_list_item_id ?? null,
      type: line.type ?? 'material',
      description: line.description ?? 'Invoice line',
      quantity: Number(line.quantity ?? 1),
      unit: line.unit ?? 'each',
      unit_price: Number(line.unit_price ?? 0),
      discount_type: line.discount_type ?? null,
      discount_value: Number(line.discount_value ?? 0),
      tax_rate: line.tax_rate ?? null,
      line_total: Number(line.line_total ?? 0),
      sort_order: index,
    })))
    if (lineError) return NextResponse.json({ error: lineError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, invoiceId: invoice.id })
}
