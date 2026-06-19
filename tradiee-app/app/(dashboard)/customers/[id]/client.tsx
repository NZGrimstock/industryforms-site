'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Customer, CustomerSite } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { CustomerForm } from '@/components/forms/customer-form'
import { SiteForm } from '@/components/forms/site-form'
import { useToast } from '@/components/ui/toast'
import { Pencil, MapPin, Plus, Trash2, ExternalLink } from 'lucide-react'

interface Props {
  customer: Customer & { customer_sites: CustomerSite[] }
  companyId: string
}

export function CustomerDetailClient({ customer, companyId }: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const [siteOpen, setSiteOpen] = useState(false)
  const [sendingPortal, setSendingPortal] = useState(false)
  const [portalSentTo, setPortalSentTo] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  async function sendPortalLink() {
    setSendingPortal(true)
    setPortalSentTo(null)
    try {
      const res = await fetch('/api/portal/send-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: customer.id, companyId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast(data.error ?? 'Failed to send portal link', 'error')
      } else {
        setPortalSentTo(data.email)
        toast(`Portal link sent to ${data.email}`)
      }
    } catch {
      toast('Failed to send portal link', 'error')
    } finally {
      setSendingPortal(false)
    }
  }

  async function deleteSite(siteId: string) {
    if (!confirm('Delete this site?')) return
    const { error } = await supabase.from('customer_sites').delete().eq('id', siteId)
    if (error) toast(error.message, 'error')
    else { toast('Site deleted'); router.refresh() }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Customer info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Contact details</CardTitle>
            <div className="flex items-center gap-1">
              {customer.email && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={sendPortalLink}
                  disabled={sendingPortal}
                  className="gap-1.5 text-xs"
                  title="Send customer portal link"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {sendingPortal ? 'Sending…' : 'Send portal link'}
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Row label="Type" value={customer.type} />
          {customer.contact_person && <Row label="Contact" value={customer.contact_person} />}
          {customer.email && <Row label="Email" value={<a href={`mailto:${customer.email}`} className="text-orange-500 hover:underline">{customer.email}</a>} />}
          {customer.phone && <Row label="Phone" value={<a href={`tel:${customer.phone}`} className="text-orange-500 hover:underline">{customer.phone}</a>} />}
          {customer.billing_address && <Row label="Billing address" value={customer.billing_address} />}
          {customer.notes && <Row label="Notes" value={customer.notes} />}
          {portalSentTo && (
            <p className="text-xs text-green-600 font-medium pt-1">Portal link sent to {portalSentTo}</p>
          )}
        </CardContent>
      </Card>

      {/* Sites */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Job sites</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setSiteOpen(true)} className="gap-1">
              <Plus className="h-4 w-4" /> Add site
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {customer.customer_sites.length === 0 ? (
            <p className="text-sm text-gray-400 px-6 pb-4">No sites added</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {customer.customer_sites.map(s => (
                <li key={s.id} className="px-6 py-3 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      {s.label && <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>}
                      <p className="text-sm text-gray-700">{s.address}</p>
                      {s.access_notes && <p className="text-xs text-gray-400 mt-0.5">{s.access_notes}</p>}
                    </div>
                  </div>
                  <button onClick={() => deleteSite(s.id)} className="text-gray-300 hover:text-red-400 p-1 shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} title="Edit customer">
        <CustomerForm companyId={companyId} customer={customer} onSuccess={() => { setEditOpen(false); router.refresh() }} />
      </Dialog>

      <Dialog open={siteOpen} onClose={() => setSiteOpen(false)} title="Add job site">
        <SiteForm customerId={customer.id} onSuccess={() => { setSiteOpen(false); router.refresh() }} />
      </Dialog>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="text-sm text-gray-400 w-32 shrink-0">{label}</span>
      <span className="text-sm text-gray-700">{value}</span>
    </div>
  )
}
