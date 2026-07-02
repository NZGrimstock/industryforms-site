'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { AddressAutocomplete } from '@/components/ui/address-autocomplete'

interface Site { id: string; address: string; label?: string | null }

interface Props {
  jobId: string
  customerId: string
  currentSiteId: string | null
  currentAddress: string | null
  customerSites: Site[]
}

export function JobSiteSelector({ jobId, customerId, currentSiteId, currentAddress, customerSites }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(currentSiteId ?? '')
  const [newAddress, setNewAddress] = useState('')
  const [saving, setSaving] = useState(false)
  const [sites, setSites] = useState<Site[]>(customerSites)

  async function save() {
    setSaving(true)
    let siteId = selected

    if (!siteId && newAddress.trim()) {
      const { data, error } = await supabase
        .from('customer_sites')
        .insert({ customer_id: customerId, address: newAddress.trim() })
        .select('id')
        .single()
      if (error) { toast(error.message, 'error'); setSaving(false); return }
      siteId = data!.id
      setSites(s => [...s, { id: siteId, address: newAddress.trim() }])
    }

    if (!siteId) { toast('Select or enter a site address', 'error'); setSaving(false); return }

    const { error } = await supabase.from('jobs').update({ site_id: siteId }).eq('id', jobId)
    if (error) { toast(error.message, 'error'); setSaving(false); return }

    toast('Site address updated')
    setOpen(false)
    setSaving(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 group mt-1"
      >
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        {currentAddress
          ? <span>{currentAddress}</span>
          : <span className="text-gray-400 italic">No site address</span>
        }
        <Pencil className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-60 transition-opacity" />
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Set job site">
        <div className="space-y-4">
          {sites.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Customer sites</p>
              {sites.map(s => (
                <label key={s.id} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="site"
                    value={s.id}
                    checked={selected === s.id}
                    onChange={() => { setSelected(s.id); setNewAddress('') }}
                    className="mt-0.5"
                  />
                  <div>
                    {s.label && <p className="text-xs text-gray-400">{s.label}</p>}
                    <p className="text-sm text-gray-700">{s.address}</p>
                  </div>
                </label>
              ))}
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              {sites.length > 0 ? 'Or add a new site' : 'Enter site address'}
            </p>
            <AddressAutocomplete
              value={newAddress}
              onChange={v => { setNewAddress(v); if (v) setSelected('') }}
              placeholder="Start typing an address…"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button onClick={save} loading={saving} disabled={!selected && !newAddress.trim()}>Save</Button>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
