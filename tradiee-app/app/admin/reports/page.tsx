import { createServiceClient } from '@/lib/supabase/server'

export default async function AdminReports() {
  const s = createServiceClient()

  const [jobsRes, invoicesRes, quotesRes, profilesRes] = await Promise.all([
    s.from('jobs').select('status, created_at'),
    s.from('invoices').select('status, total, created_at'),
    s.from('quotes').select('status, created_at'),
    s.from('profiles').select('created_at').order('created_at', { ascending: false }),
  ])

  const jobs = jobsRes.data ?? []
  const invoices = invoicesRes.data ?? []
  const quotes = quotesRes.data ?? []
  const profiles = profilesRes.data ?? []

  // Monthly sign-ups (last 6 months)
  const now = new Date()
  const months: { label: string; count: number }[] = []
  for (let m = 5; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1)
    const label = d.toLocaleDateString('en-NZ', { month: 'short', year: '2-digit' })
    const count = profiles.filter(p => {
      const pd = new Date(p.created_at)
      return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth()
    }).length
    months.push({ label, count })
  }

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total ?? 0), 0)
  const pendingRevenue = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + (i.total ?? 0), 0)
  const jobStatusCounts = jobs.reduce((acc, j) => ({ ...acc, [j.status]: (acc[j.status] ?? 0) + 1 }), {} as Record<string, number>)
  const quoteWinRate = quotes.length ? Math.round(quotes.filter(q => q.status === 'accepted').length / quotes.length * 100) : 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Platform reports</h1>
        <p className="text-gray-400 text-sm mt-1">Aggregate usage across all companies</p>
      </div>

      {/* Revenue summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total paid revenue', value: `$${(totalRevenue).toLocaleString('en-NZ', { maximumFractionDigits: 0 })}` },
          { label: 'Pending revenue', value: `$${(pendingRevenue).toLocaleString('en-NZ', { maximumFractionDigits: 0 })}` },
          { label: 'Quote win rate', value: `${quoteWinRate}%` },
          { label: 'Total profiles', value: profiles.length.toString() },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-gray-400 text-sm mb-2">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Job status breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Job status breakdown</h2>
          <div className="space-y-3">
            {Object.entries(jobStatusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center gap-3">
                <span className="text-gray-400 text-sm capitalize w-28">{status.replace('_', ' ')}</span>
                <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-orange-500"
                    style={{ width: `${Math.min(100, (count / jobs.length) * 100)}%` }}
                  />
                </div>
                <span className="text-white text-sm font-medium w-8 text-right">{count}</span>
              </div>
            ))}
            {jobs.length === 0 && <p className="text-gray-500 text-sm">No jobs yet</p>}
          </div>
        </div>

        {/* Monthly sign-ups */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">New users (last 6 months)</h2>
          <div className="flex items-end gap-2 h-24">
            {months.map(({ label, count }) => {
              const maxCount = Math.max(...months.map(m => m.count), 1)
              const pct = count / maxCount * 100
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-orange-500/80 rounded-t"
                    style={{ height: `${Math.max(4, pct)}%` }}
                    title={`${count} users`}
                  />
                  <span className="text-[10px] text-gray-500">{label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
