import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { Briefcase, List, LayoutGrid, Map } from 'lucide-react'
import React from 'react'
import { NewJobButton } from './client'
import { JobBoard } from './board'

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ status?: string; view?: string }> }) {
  const sp = await searchParams
  const view = (sp.view ?? 'list') as 'list' | 'board' | 'map'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('company_id, full_name, role').eq('id', user!.id).single()
  const [customersRes, priceItemsRes] = await Promise.all([
    supabase.from('customers').select('id, name').eq('company_id', profile!.company_id).order('name'),
    supabase.from('price_list_items').select('id, name, unit, sell_price, cost_price').eq('company_id', profile!.company_id).eq('is_active', true).order('name'),
  ])
  const customers = customersRes.data
  const priceItems = priceItemsRes.data ?? []

  // Board needs all active statuses; list can be filtered
  let query = supabase.from('jobs').select('*, customers(name), profiles(full_name), customer_sites(address)').eq('company_id', profile!.company_id)
  if (view === 'list' && sp.status) query = query.eq('status', sp.status)
  if (view === 'board') query = query.not('status', 'in', '(cancelled)')
  const { data: jobs } = await query.order('created_at', { ascending: false })

  const statuses = ['unscheduled', 'scheduled', 'in_progress', 'on_hold', 'completed', 'cancelled']
  const { count } = await supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('company_id', profile!.company_id)
  const nextJobNumber = `J-${String((count ?? 0) + 1).padStart(4, '0')}`

  const viewLinks: Array<{ key: string; icon: React.ComponentType<{className?: string}>; label: string; href?: string }> = [
    { key: 'list', icon: List, label: 'List' },
    { key: 'board', icon: LayoutGrid, label: 'Board' },
    { key: 'map', icon: Map, label: 'Map', href: '/jobs/map' },
  ]

  return (
    <>
      <Header title="Jobs" profile={profile} />
      <div className="p-6">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          {/* Status filters (list view only) */}
          {view === 'list' && (
            <div className="flex gap-1 overflow-x-auto">
              <Link href="/jobs?view=list" className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${!sp.status ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>All</Link>
              {statuses.map(s => (
                <Link key={s} href={`/jobs?view=list&status=${s}`} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${sp.status === s ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {s.replace(/_/g, ' ')}
                </Link>
              ))}
            </div>
          )}
          {view === 'board' && <p className="text-sm text-gray-500">Drag cards to update status</p>}

          <div className="flex items-center gap-2 ml-auto">
            {/* View toggle */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {viewLinks.map(({ key, icon: Icon, label, href: customHref }) => (
                <Link
                  key={key}
                  href={customHref ?? `/jobs?view=${key}`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Icon className="h-3.5 w-3.5" />{label}
                </Link>
              ))}
            </div>
            <NewJobButton companyId={profile!.company_id} customers={customers ?? []} nextJobNumber={nextJobNumber} priceItems={priceItems} />
          </div>
        </div>

        {view === 'board' && (
          <JobBoard initialJobs={(jobs ?? []) as Parameters<typeof JobBoard>[0]['initialJobs']} />
        )}

        {view === 'list' && (
          !jobs?.length ? (
            <EmptyState icon={Briefcase} title="No jobs" description="Create a job to start tracking work" action={
              <NewJobButton companyId={profile!.company_id} customers={customers ?? []} nextJobNumber={nextJobNumber} priceItems={priceItems} />
            } />
          ) : (
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Job #</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Title</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Customer</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Assigned to</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {jobs.map(j => (
                    <tr key={j.id} className="hover:bg-gray-50 cursor-pointer">
                      <td className="p-0"><Link href={`/jobs/${j.id}`} className="block px-6 py-3 font-medium text-gray-900">{j.job_number}</Link></td>
                      <td className="p-0"><Link href={`/jobs/${j.id}`} className="block px-6 py-3 text-gray-700 max-w-[200px] truncate">{j.title}</Link></td>
                      <td className="p-0"><Link href={`/jobs/${j.id}`} className="block px-6 py-3 text-gray-600">{(j.customers as {name: string} | null)?.name ?? '—'}</Link></td>
                      <td className="p-0"><Link href={`/jobs/${j.id}`} className="block px-6 py-3"><StatusBadge status={j.status} /></Link></td>
                      <td className="p-0"><Link href={`/jobs/${j.id}`} className="block px-6 py-3 text-gray-500">{(j.profiles as {full_name: string} | null)?.full_name ?? '—'}</Link></td>
                      <td className="p-0"><Link href={`/jobs/${j.id}`} className="block px-6 py-3 text-gray-400">{formatDate(j.created_at)}</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )
        )}
      </div>
    </>
  )
}
