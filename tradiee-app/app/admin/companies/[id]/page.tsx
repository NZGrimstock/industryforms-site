import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { TakedownToggle } from './takedown-toggle'

export default async function AdminCompanyDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = createServiceClient()

  const [{ data: company }, { data: site }, { data: profiles }] = await Promise.all([
    s.from('companies').select('id, name, country, trade_type, created_at, subscription_status, subscription_plan, trial_ends_at, billing_exempt, addons').eq('id', id).single(),
    s.from('company_websites').select('slug, is_published, site_mode, custom_site_key, custom_site_status, bookings_enabled, custom_domain').eq('company_id', id).maybeSingle(),
    s.from('profiles').select('id, full_name, email, role').eq('company_id', id).order('created_at'),
  ])

  if (!company) notFound()

  const addons = (company.addons ?? {}) as Record<string, { active?: boolean }>

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{company.name}</h1>
        <p className="text-gray-400 text-sm mt-1 font-mono">{company.id}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <InfoCard label="Country" value={company.country ?? '—'} />
        <InfoCard label="Trade" value={company.trade_type ?? '—'} />
        <InfoCard label="Plan" value={`${company.subscription_plan ?? 'trial'} (${company.subscription_status ?? '—'})`} />
        <InfoCard label="Billing exempt" value={company.billing_exempt ? 'Yes' : 'No'} />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-white mb-3">Add-ons</h2>
        {Object.keys(addons).length === 0 ? (
          <p className="text-sm text-gray-500">None active</p>
        ) : (
          <ul className="space-y-1.5">
            {Object.entries(addons).map(([slug, v]) => (
              <li key={slug} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{slug}</span>
                <span className={v.active ? 'text-green-400' : 'text-gray-500'}>{v.active ? 'Active' : 'Inactive'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {site && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-white mb-3">Website</h2>
          <dl className="space-y-1.5 text-sm mb-4">
            <Row label="Slug" value={site.slug} />
            <Row label="Published" value={site.is_published ? 'Yes' : 'No'} />
            <Row label="Bookings enabled" value={site.bookings_enabled ? 'Yes' : 'No'} />
            <Row label="Hosting mode" value={site.site_mode} />
            {site.custom_domain && <Row label="Custom domain" value={site.custom_domain} />}
          </dl>
          {site.site_mode === 'custom' && site.custom_site_key && (
            <TakedownToggle companyId={company.id} disabled={site.custom_site_status === 'disabled'} />
          )}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-3">Users ({profiles?.length ?? 0})</h2>
        <ul className="space-y-1.5">
          {(profiles ?? []).map(p => (
            <li key={p.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-300">{p.full_name || p.email}</span>
              <span className="text-gray-500 capitalize">{p.role}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm text-white font-medium">{value}</p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-300">{value}</dd>
    </div>
  )
}
