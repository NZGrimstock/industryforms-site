'use client'
import { useState } from 'react'

type Request = {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  business_name: string | null
  reason: string | null
  status: string
  matched_profile_id: string | null
  matched_company_id: string | null
  created_at: string
  reviewed_at: string | null
  internal_notes: string | null
}

const statusBadge: Record<string, string> = {
  pending: 'bg-amber-900/40 text-amber-400 border-amber-800',
  verifying: 'bg-blue-900/40 text-blue-400 border-blue-800',
  completed: 'bg-green-900/40 text-green-400 border-green-800',
  rejected: 'bg-red-900/40 text-red-400 border-red-800',
  cancelled: 'bg-gray-800 text-gray-400 border-gray-700',
}

export function DeletionRequestsClient({ requests: initial }: { requests: Request[] }) {
  const [requests, setRequests] = useState(initial)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function act(id: string, action: 'verify' | 'reject' | 'complete') {
    if (action === 'complete' && !confirm('This will permanently delete the matched user\'s login and profile (name/email/phone). Company records, invoices, and jobs are retained. This cannot be undone. Continue?')) return
    setBusyId(id)
    const res = await fetch('/api/admin/deletion-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    })
    const data = await res.json()
    if (res.ok) {
      setRequests(rs => rs.map(r => r.id === id ? { ...r, status: data.status, reviewed_at: new Date().toISOString() } : r))
    } else {
      alert(data.error ?? 'Action failed')
    }
    setBusyId(null)
  }

  return (
    <div className="space-y-3">
      {requests.length === 0 && <p className="text-gray-500 text-sm">No deletion requests.</p>}
      {requests.map(r => (
        <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-white font-medium">{r.full_name || r.email}</p>
              <p className="text-gray-400 text-sm">{r.email}{r.phone ? ` · ${r.phone}` : ''}{r.business_name ? ` · ${r.business_name}` : ''}</p>
              <p className="text-gray-500 text-xs mt-1">Requested {new Date(r.created_at).toLocaleString()}</p>
              {r.reason && <p className="text-gray-400 text-sm mt-2 max-w-xl">{r.reason}</p>}
              {!r.matched_profile_id && <p className="text-amber-400 text-xs mt-2">No matching account found for this email.</p>}
            </div>
            <span className={`text-xs px-2 py-1 rounded-full border shrink-0 ${statusBadge[r.status] ?? statusBadge.cancelled}`}>{r.status}</span>
          </div>
          {r.status !== 'completed' && r.status !== 'rejected' && (
            <div className="flex gap-2 mt-4">
              {r.status === 'pending' && (
                <button onClick={() => act(r.id, 'verify')} disabled={busyId === r.id}
                  className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50">
                  Mark verifying
                </button>
              )}
              <button onClick={() => act(r.id, 'complete')} disabled={busyId === r.id}
                className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-500 disabled:opacity-50">
                Complete deletion
              </button>
              <button onClick={() => act(r.id, 'reject')} disabled={busyId === r.id}
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50">
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
