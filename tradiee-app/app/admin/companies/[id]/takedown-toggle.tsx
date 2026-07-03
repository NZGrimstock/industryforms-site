'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, CheckCircle2 } from 'lucide-react'

export function TakedownToggle({ companyId, disabled }: { companyId: string; disabled: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function toggle() {
    const next = !disabled
    if (next && !confirm('Disable this company\'s custom-hosted site immediately? Visitors will see a 403 until re-enabled.')) return
    setLoading(true)
    const res = await fetch('/api/admin/site/takedown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, disabled: next }),
    })
    setLoading(false)
    if (res.ok) router.refresh()
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
        disabled ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
      }`}
    >
      {disabled ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
      {disabled ? 'Re-enable site' : 'Disable site (takedown)'}
    </button>
  )
}
