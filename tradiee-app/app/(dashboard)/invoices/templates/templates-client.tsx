'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { LayoutTemplate } from 'lucide-react'

export function InvoiceTemplatesClient({
  templates,
  customers,
}: {
  templates: { id: string; name: string; created_at: string }[]
  customers: { id: string; name: string }[]
}) {
  const [customerByTemplate, setCustomerByTemplate] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState('')
  const router = useRouter()
  const { toast } = useToast()

  async function createInvoice(templateId: string) {
    const customerId = customerByTemplate[templateId]
    if (!customerId) { toast('Select a customer first', 'error'); return }
    setLoading(templateId)
    const res = await fetch('/api/invoice-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_invoice', templateId, customerId }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading('')
    if (!res.ok) { toast(data.error ?? 'Failed to create invoice', 'error'); return }
    router.push(`/invoices/${data.invoiceId}`)
  }

  return (
    <div className="p-6 max-w-4xl">
      {templates.length === 0 ? (
        <EmptyState icon={LayoutTemplate} title="No invoice templates" description="Open an invoice and save it as a template to reuse its lines later." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(template => (
            <Card key={template.id}>
              <CardHeader><CardTitle>{template.name}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Select
                  value={customerByTemplate[template.id] ?? ''}
                  onChange={e => setCustomerByTemplate(prev => ({ ...prev, [template.id]: e.target.value }))}
                  placeholder="Select customer"
                  options={customers.map(customer => ({ value: customer.id, label: customer.name }))}
                />
                <Button size="sm" loading={loading === template.id} onClick={() => createInvoice(template.id)}>Create draft invoice</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
