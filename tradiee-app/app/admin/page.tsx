import { createServiceClient } from '@/lib/supabase/server'
import { Users, Briefcase, Receipt, TrendingUp } from 'lucide-react'

async function getStats() {
  const s = createServiceClient()
  const [companies, profiles, jobs, invoices] = await Promise.all([
    s.from('companies').select('id', { count: 'exact', head: true }),
    s.from('profiles').select('id', { count: 'exact', head: true }),
    s.from('jobs').select('id', { count: 'exact', head: true }),
    s.from('invoices').select('id, total, status', { count: 'exact' }),
  ])

  const paidTotal = (invoices.data ?? [])
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + (i.total ?? 0), 0)

  return {
    companies: companies.count ?? 0,
    users: profiles.count ?? 0,
    jobs: jobs.count ?? 0,
    invoiceCount: invoices.count ?? 0,
    paidRevenue: paidTotal,
  }
}

async function getRecentCompanies() {
  const s = createServiceClient()
  const { data } = await s
    .from('companies')
    .select('id, name, country, created_at')
    .order('created_at', { ascending: false })
    .limit(10)
  return data ?? []
}

function StatCard({ label, value, icon: Icon, sub }: { label: string; value: string; icon: React.ElementType; sub?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center">
          <Icon className="h-5 w-5 text-orange-400" />
        </div>
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

export default async function AdminOverview() {
  const [stats, recent] = await Promise.all([getStats(), getRecentCompanies()])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Admin overview</h1>
        <p className="text-gray-400 text-sm mt-1">Platform-wide metrics and activity</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard label="Companies" value={stats.companies.toString()} icon={Users} />
        <StatCard label="Users" value={stats.users.toString()} icon={Users} />
        <StatCard label="Jobs" value={stats.jobs.toString()} icon={Briefcase} />
        <StatCard
          label="Paid invoices"
          value={`$${(stats.paidRevenue / 100).toLocaleString('en-NZ', { maximumFractionDigits: 0 })}`}
          icon={TrendingUp}
          sub={`${stats.invoiceCount} total invoices`}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Receipt className="h-4 w-4 text-orange-400" />
          Recent sign-ups
        </h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Company</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Country</th>
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((c, i) => (
                <tr key={c.id} className={i < recent.length - 1 ? 'border-b border-gray-800' : ''}>
                  <td className="px-5 py-3 text-white font-medium">{c.name}</td>
                  <td className="px-5 py-3 text-gray-400">{c.country ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-400">
                    {new Date(c.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr><td colSpan={3} className="px-5 py-8 text-center text-gray-500">No companies yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
