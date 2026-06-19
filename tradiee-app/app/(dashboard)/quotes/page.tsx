import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { FileText, Plus } from 'lucide-react'

export default async function QuotesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('company_id, full_name, role').eq('id', user!.id).single()

  const { data: quotes } = await supabase
    .from('quotes')
    .select('*, customers(name)')
    .eq('company_id', profile!.company_id)
    .order('created_at', { ascending: false })

  return (
    <>
      <Header title="Quotes" profile={profile} />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">{quotes?.length ?? 0} quotes</p>
          <Link href="/quotes/new" className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Plus className="h-4 w-4" /> New quote
          </Link>
        </div>
        {!quotes?.length ? (
          <EmptyState icon={FileText} title="No quotes yet" description="Create your first quote to get started" action={
            <Link href="/quotes/new" className="inline-flex items-center gap-2 bg-orange-500 text-white text-sm font-medium px-4 py-2 rounded-lg">
              <Plus className="h-4 w-4" /> New quote
            </Link>
          } />
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Quote #</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Customer</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Title</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-500">Total</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {quotes.map(q => (
                  <tr key={q.id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="p-0">
                      <Link href={`/quotes/${q.id}`} className="block px-6 py-3 font-medium text-gray-900">{q.quote_number}</Link>
                    </td>
                    <td className="p-0">
                      <Link href={`/quotes/${q.id}`} className="block px-6 py-3 text-gray-700">{(q.customers as {name: string} | null)?.name ?? '—'}</Link>
                    </td>
                    <td className="p-0">
                      <Link href={`/quotes/${q.id}`} className="block px-6 py-3 text-gray-600 truncate max-w-[200px]">{q.title}</Link>
                    </td>
                    <td className="p-0">
                      <Link href={`/quotes/${q.id}`} className="block px-6 py-3"><StatusBadge status={q.status} /></Link>
                    </td>
                    <td className="p-0">
                      <Link href={`/quotes/${q.id}`} className="block px-6 py-3 text-right font-medium text-gray-900">{formatCurrency(q.total)}</Link>
                    </td>
                    <td className="p-0">
                      <Link href={`/quotes/${q.id}`} className="block px-6 py-3 text-gray-500">{formatDate(q.created_at)}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </>
  )
}
