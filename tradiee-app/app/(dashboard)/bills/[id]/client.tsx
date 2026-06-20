'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { DollarSign, CheckCircle, Trash2 } from 'lucide-react'

interface Props {
  bill: { id: string; total: number; amount_paid: number; status: string }
}

export function BillActions({ bill }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState('')
  const [payOpen, setPayOpen] = useState(false)
  const owing = bill.total - bill.amount_paid
  const [amount, setAmount] = useState(owing > 0 ? owing.toFixed(2) : '')

  async function markPaid() {
    setLoading('paid')
    const { error } = await supabase.from('bills').update({ amount_paid: bill.total, status: 'paid' }).eq('id', bill.id)
    if (error) toast(error.message, 'error'); else { toast('Bill marked paid'); router.refresh() }
    setLoading('')
  }

  async function recordPayment() {
    const amt = parseFloat(amount) || 0
    if (amt <= 0) { toast('Enter an amount', 'error'); return }
    setLoading('pay')
    const newPaid = bill.amount_paid + amt
    const status = newPaid >= bill.total - 0.01 ? 'paid' : 'partially_paid'
    const { error } = await supabase.from('bills').update({ amount_paid: newPaid, status }).eq('id', bill.id)
    if (error) toast(error.message, 'error')
    else { toast('Payment recorded'); setPayOpen(false); router.refresh() }
    setLoading('')
  }

  async function deleteBill() {
    if (!confirm('Delete this bill?')) return
    setLoading('delete')
    await supabase.from('bills').delete().eq('id', bill.id)
    toast('Bill deleted')
    router.push('/bills')
  }

  return (
    <div className="flex items-center gap-2">
      {bill.status !== 'paid' && <Button size="sm" loading={loading === 'pay'} onClick={() => setPayOpen(true)}><DollarSign className="h-4 w-4" /> Record payment</Button>}
      {bill.status !== 'paid' && <Button variant="outline" size="sm" loading={loading === 'paid'} onClick={markPaid}><CheckCircle className="h-4 w-4" /> Mark paid</Button>}
      <Button variant="ghost" size="sm" loading={loading === 'delete'} onClick={deleteBill}><Trash2 className="h-4 w-4 text-red-400" /></Button>

      <Dialog open={payOpen} onClose={() => setPayOpen(false)} title="Record payment">
        <div className="space-y-4">
          <div>
            <Label>Amount</Label>
            <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div className="flex gap-3"><Button loading={loading === 'pay'} onClick={recordPayment}>Record</Button><Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button></div>
        </div>
      </Dialog>
    </div>
  )
}
