'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/utils'

type Bill = {
  id: string
  supplier_id: string | null
  job_id: string | null
  purchase_order_id: string | null
  reference: string | null
  bill_date: string
  due_date: string | null
  total: number
  notes: string | null
}

interface Props {
  companyId: string
  profileId: string
  gstRate: number
  suppliers: { id: string; name: string }[]
  jobs: { id: string; job_number: string; title: string }[]
  bill?: Bill
  defaults?: { supplier_id?: string; job_id?: string; purchase_order_id?: string; total?: number }
}

export function BillForm({ companyId, profileId, gstRate, suppliers, jobs, bill, defaults }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    supplier_id: bill?.supplier_id ?? defaults?.supplier_id ?? '',
    job_id: bill?.job_id ?? defaults?.job_id ?? '',
    reference: bill?.reference ?? '',
    bill_date: bill?.bill_date ?? new Date().toISOString().slice(0, 10),
    due_date: bill?.due_date ?? '',
    total: String(bill?.total ?? defaults?.total ?? ''),
    notes: bill?.notes ?? '',
  })
  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  const total = parseFloat(form.total) || 0
  const gst = total - total / (1 + gstRate)
  const subtotal = total - gst

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (total <= 0) { toast('Enter the bill total', 'error'); return }
    setLoading(true)
    const payload = {
      company_id: companyId,
      supplier_id: form.supplier_id || null,
      job_id: form.job_id || null,
      purchase_order_id: bill?.purchase_order_id ?? defaults?.purchase_order_id ?? null,
      reference: form.reference || null,
      bill_date: form.bill_date,
      due_date: form.due_date || null,
      subtotal, gst_amount: gst, total,
      notes: form.notes || null,
      created_by: profileId,
    }
    const { error } = bill
      ? await supabase.from('bills').update(payload).eq('id', bill.id)
      : await supabase.from('bills').insert(payload)
    if (error) { toast(error.message, 'error'); setLoading(false); return }
    toast(bill ? 'Bill updated' : 'Bill recorded')
    router.push('/bills')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Supplier</Label>
          <Select value={form.supplier_id} onChange={e => set('supplier_id', e.target.value)} placeholder="Select supplier…" options={suppliers.map(s => ({ value: s.id, label: s.name }))} />
        </div>
        <div>
          <Label>Reference</Label>
          <Input value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="Supplier invoice #" />
        </div>
        <div>
          <Label>Bill date</Label>
          <Input type="date" value={form.bill_date} onChange={e => set('bill_date', e.target.value)} />
        </div>
        <div>
          <Label>Due date</Label>
          <Input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
        </div>
        <div>
          <Label>Total (incl. GST) <span className="text-red-400">*</span></Label>
          <Input type="number" step="0.01" value={form.total} onChange={e => set('total', e.target.value)} required placeholder="0.00" />
          {total > 0 && <p className="text-xs text-gray-400 mt-1">Excl. GST {formatCurrency(subtotal)} · GST {formatCurrency(gst)}</p>}
        </div>
        <div>
          <Label>Link to job</Label>
          <Select value={form.job_id} onChange={e => set('job_id', e.target.value)} placeholder="No job" options={jobs.map(j => ({ value: j.id, label: `${j.job_number} — ${j.title}` }))} />
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading}>{bill ? 'Save changes' : 'Record bill'}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  )
}
