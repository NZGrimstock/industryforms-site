// Shared by api/bookings/create (no-deposit auto-confirm), the Stripe webhook
// (deposit paid), and the admin confirm action — all three need to turn a
// confirmed booking into a job + visit exactly once.
import { nextDocNumber } from '@/lib/numbering'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createJobFromBooking(service: any, booking: {
  id: string
  company_id: string
  customer_id: string | null
  site_id?: string | null
  assigned_to: string | null
  starts_at: string
  ends_at: string
}, packageName: string) {
  if (!booking.customer_id) return null

  const job_number = await nextDocNumber(service, booking.company_id, 'job')
  const { data: job } = await service.from('jobs').insert({
    job_number,
    title: packageName,
    company_id: booking.company_id,
    customer_id: booking.customer_id,
    site_id: booking.site_id ?? null,
    status: 'scheduled',
    assigned_to: booking.assigned_to,
  }).select('id').single()
  if (!job) return null

  const { data: visit } = await service.from('job_visits').insert({
    job_id: job.id,
    scheduled_start: booking.starts_at,
    scheduled_end: booking.ends_at,
    status: 'scheduled',
    assigned_to: booking.assigned_to,
  }).select('id').single()

  await service.from('bookings').update({ job_id: job.id, visit_id: visit?.id ?? null }).eq('id', booking.id)
  return job.id
}
