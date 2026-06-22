'use client'
import { useState } from 'react'

type Company = {
  id: string
  name: string
  subscription_plan: string | null
  subscription_status: string | null
  trial_ends_at: string | null
  stripe_customer_id: string | null
  created_at: string
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    trialing:  'bg-blue-900/40 text-blue-400 border-blue-800',
    active:    'bg-green-900/40 text-green-400 border-green-800',
    past_due:  'bg-amber-900/40 text-amber-400 border-amber-800',
    canceled:  'bg-gray-800 text-gray-400 border-gray-700',
    cancelled: 'bg-gray-800 text-gray-400 border-gray-700',
  }
  return map[status] ?? 'bg-gray-800 text-gray-400 border-gray-700'
}

export function SubscriptionsClient({ companies: initial }: { companies: Company[] }) {
  const [companies, setCompanies] = useState(initial)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const planCounts = companies.reduce((acc, c) => {
    const plan = c.subscription_plan ?? 'trial'
    acc[plan] = (acc[plan] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  async function trialAction(companyId: string, action: 'extend' | 'reset' | 'end', days?: number) {
    setLoadingId(companyId)
    const res = await fetch('/api/admin/trial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, action, days }),
    })
    const data = await res.json()
    if (data.ok) {
      setCompanies(cs => cs.map(c => c.id === companyId
        ? { ...c, subscription_plan: 'trial', subscription_status: 'trialing', trial_ends_at: data.trial_ends_at ?? (action === 'end' ? new Date().toISOString() : c.trial_ends_at) }
        : c
      ))
    }
    setLoadingId(null)
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Subscriptions</h1>
        <p className="text-gray-400 text-sm mt-1">{companies.length} companies</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {(['trial', 'solo', 'team', 'pro'] as const).map(plan => (
          <div key={plan} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm capitalize mb-1">{plan}</p>
            <p className="text-3xl font-bold text-white">{planCounts[plan] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-5 py-3 text-gray-400 font-medium">Company</th>
              <th className="text-left px-5 py-3 text-gray-400 font-medium">Plan</th>
              <th className="text-left px-5 py-3 text-gray-400 font-medium">Status</th>
              <th className="text-left px-5 py-3 text-gray-400 font-medium">Trial ends</th>
              <th className="text-left px-5 py-3 text-gray-400 font-medium">Stripe customer</th>
              <th className="text-left px-5 py-3 text-gray-400 font-medium">Trial actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c, i) => {
              const busy = loadingId === c.id
              const trialEnd = c.trial_ends_at ? new Date(c.trial_ends_at) : null
              const expired = trialEnd && trialEnd < new Date()
              return (
                <tr key={c.id} className={i < companies.length - 1 ? 'border-b border-gray-800' : ''}>
                  <td className="px-5 py-3 text-white font-medium">{c.name}</td>
                  <td className="px-5 py-3 text-gray-300 capitalize">{c.subscription_plan ?? 'trial'}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${statusBadge(c.subscription_status ?? 'trialing')}`}>
                      {(c.subscription_status ?? 'trialing').replace('_', ' ')}
                    </span>
                  </td>
                  <td className={`px-5 py-3 text-sm ${expired ? 'text-red-400' : 'text-gray-400'}`}>
                    {trialEnd
                      ? trialEnd.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-500 font-mono text-xs truncate max-w-[140px]">
                    {c.stripe_customer_id ?? '—'}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        disabled={busy}
                        onClick={() => trialAction(c.id, 'extend', 7)}
                        className="text-xs px-2 py-1 rounded bg-blue-900/40 text-blue-400 border border-blue-800 hover:bg-blue-900/60 transition-colors disabled:opacity-50"
                      >
                        +7d
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => trialAction(c.id, 'extend', 30)}
                        className="text-xs px-2 py-1 rounded bg-blue-900/40 text-blue-400 border border-blue-800 hover:bg-blue-900/60 transition-colors disabled:opacity-50"
                      >
                        +30d
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => trialAction(c.id, 'reset')}
                        className="text-xs px-2 py-1 rounded bg-green-900/40 text-green-400 border border-green-800 hover:bg-green-900/60 transition-colors disabled:opacity-50"
                      >
                        Reset 30d
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => { if (confirm(`End trial for ${c.name}?`)) trialAction(c.id, 'end') }}
                        className="text-xs px-2 py-1 rounded bg-red-900/40 text-red-400 border border-red-800 hover:bg-red-900/60 transition-colors disabled:opacity-50"
                      >
                        End trial
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {companies.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-500">No companies yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
