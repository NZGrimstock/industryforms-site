// Shared by the no-deposit auto-confirm path (api/bookings/create) and the
// deposit-paid webhook branch — both need to send the same confirmation email
// once a booking reaches 'confirmed'. Email only for now per the Sprint D
// scope note — Sprint E's notify() channel-aware helper isn't built yet.
import { sendEmail, bookingConfirmationEmailHtml } from '@/lib/email'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendBookingConfirmationEmail(service: any, companyId: string, booking: {
  customer_email: string | null
  customer_name: string
  starts_at: string
  site_address: string | null
}, packageName: string) {
  if (!booking.customer_email) return

  const [{ data: company }, { data: settings }] = await Promise.all([
    service.from('companies').select('name, phone').eq('id', companyId).single(),
    service.from('booking_settings').select('timezone').eq('company_id', companyId).maybeSingle(),
  ])
  if (!company) return

  const { subject, html } = bookingConfirmationEmailHtml({
    companyName: company.name,
    customerName: booking.customer_name,
    packageName,
    startsAt: booking.starts_at,
    timezone: settings?.timezone ?? 'Pacific/Auckland',
    siteAddress: booking.site_address,
    companyPhone: company.phone,
  })
  await sendEmail({ to: booking.customer_email, subject, html })
}
