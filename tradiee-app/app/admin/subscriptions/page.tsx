import { createServiceClient } from '@/lib/supabase/server'

export default async function AdminSubscriptions() {
  const s = createServiceClient()

  const { data: companies } = await s
    .from('companies')
    .select('id, name, subscription_plan, subscription_status, trial_ends_at, stripe_customer_id, created_at')
    .order('created_at', { ascending: false })

  const rows = companies ?? []

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

  const planCounts = rows.reduce((acc, c) => {
    const plan = c.subscription_plan ?? 'trial'
    acc[plan] = (acc[plan] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Subscriptions</h1>
        <p className="text-gray-400 text-sm mt-1">{rows.length} companies</p>
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
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => (
              <tr key={c.id} className={i < rows.length - 1 ? 'border-b border-gray-800' : ''}>
                <td className="px-5 py-3 text-white font-medium">{c.name}</td>
                <td className="px-5 py-3 text-gray-300 capitalize">{c.subscription_plan ?? 'trial'}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${statusBadge(c.subscription_status ?? 'trialing')}`}>
                    {(c.subscription_status ?? 'trialing').replace('_', ' ')}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-400">
                  {c.trial_ends_at
                    ? new Date(c.trial_ends_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—'}
                </td>
                <td className="px-5 py-3 text-gray-500 font-mono text-xs truncate max-w-[160px]">
                  {c.stripe_customer_id ?? '—'}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-500">No companies yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
