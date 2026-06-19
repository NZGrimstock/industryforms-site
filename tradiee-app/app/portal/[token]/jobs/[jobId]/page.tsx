import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { Wrench, ArrowLeft } from 'lucide-react'

export default async function PortalJobDetailPage({
  params,
}: {
  params: Promise<{ token: string; jobId: string }>
}) {
  const { token, jobId } = await params
  const supabase = createServiceClient()

  // Validate portal token
  const { data: portalToken } = await supabase
    .from('customer_portal_tokens')
    .select('customer_id, company_id, expires_at')
    .eq('token', token)
    .single()

  if (!portalToken || new Date(portalToken.expires_at) < new Date()) {
    notFound()
  }

  const { customer_id, company_id } = portalToken

  // Fetch company for header
  const { data: company } = await supabase
    .from('companies')
    .select('name, email, phone, logo_url')
    .eq('id', company_id)
    .single()

  if (!company) notFound()

  // Fetch job — must belong to the portal's customer
  const { data: job } = await supabase
    .from('jobs')
    .select('id, job_number, title, description, status, customer_id, created_at')
    .eq('id', jobId)
    .eq('company_id', company_id)
    .single()

  if (!job || job.customer_id !== customer_id) notFound()

  // Fetch visits and notes in parallel
  const [visitsRes, notesRes] = await Promise.all([
    supabase
      .from('job_visits')
      .select('id, scheduled_start, scheduled_end, status, notes')
      .eq('job_id', jobId)
      .order('scheduled_start', { ascending: true }),
    supabase
      .from('job_notes')
      .select('id, body, created_at')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true }),
  ])

  const visits = visitsRes.data ?? []
  const notes = notesRes.data ?? []

  const JOB_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    unscheduled: { label: 'Unscheduled', className: 'bg-gray-100 text-gray-600' },
    scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-700' },
    in_progress: { label: 'In progress', className: 'bg-orange-100 text-orange-700' },
    on_hold: { label: 'On hold', className: 'bg-yellow-100 text-yellow-700' },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-600' },
  }

  const VISIT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-700' },
    in_progress: { label: 'In progress', className: 'bg-orange-100 text-orange-700' },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-600' },
    no_show: { label: 'No show', className: 'bg-gray-100 text-gray-500' },
  }

  const statusConfig = JOB_STATUS_CONFIG[job.status] ?? { label: job.status, className: 'bg-gray-100 text-gray-600' }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            {company.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logo_url} alt={company.name} className="h-8 object-contain" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
                <Wrench className="h-4 w-4 text-white" />
              </div>
            )}
            <span className="font-semibold text-gray-900">{company.name}</span>
          </div>
          <div className="text-right text-xs text-gray-400">
            {company.email && <p>{company.email}</p>}
            {company.phone && <p>{company.phone}</p>}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Back link */}
        <Link
          href={`/portal/${token}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to portal
        </Link>

        {/* Job header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">
                {job.job_number}
              </p>
              <h1 className="text-xl font-bold text-gray-900">{job.title}</h1>
              <p className="text-xs text-gray-400 mt-1">Created {formatDate(job.created_at)}</p>
            </div>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${statusConfig.className}`}
            >
              {statusConfig.label}
            </span>
          </div>
          {job.description && (
            <p className="mt-4 text-sm text-gray-600 whitespace-pre-wrap">{job.description}</p>
          )}
        </div>

        {/* Scheduled visits */}
        {visits.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Scheduled visits</h2>
            </div>
            <ul className="divide-y divide-gray-50">
              {visits.map((visit) => {
                const vstConfig = VISIT_STATUS_CONFIG[visit.status] ?? {
                  label: visit.status,
                  className: 'bg-gray-100 text-gray-600',
                }
                const start = new Date(visit.scheduled_start)
                const end = new Date(visit.scheduled_end)
                const dateStr = start.toLocaleDateString('en-NZ', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
                const timeStr = `${start.toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' })} – ${end.toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' })}`
                return (
                  <li key={visit.id} className="px-6 py-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{dateStr}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{timeStr}</p>
                      {visit.notes && (
                        <p className="text-xs text-gray-400 mt-1">{visit.notes}</p>
                      )}
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${vstConfig.className}`}
                    >
                      {vstConfig.label}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Job notes (no author shown) */}
        {notes.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Notes</h2>
            </div>
            <ul className="divide-y divide-gray-50">
              {notes.map((note) => (
                <li key={note.id} className="px-6 py-3">
                  <p className="text-xs text-gray-400 mb-1">{formatDate(note.created_at)}</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.body}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-center text-xs text-gray-300 pb-4">Powered by IndustryForms</p>
      </div>
    </div>
  )
}
