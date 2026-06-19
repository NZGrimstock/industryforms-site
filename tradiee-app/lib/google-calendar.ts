import { createServiceClient } from '@/lib/supabase/server'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!

interface GoogleTokenRow {
  google_access_token: string | null
  google_refresh_token: string | null
  google_token_expiry: string | null
  google_calendar_id: string | null
}

/**
 * Returns a valid access token for the given user, refreshing if expired.
 */
export async function getValidToken(userId: string): Promise<string> {
  const service = createServiceClient()
  const { data: profile, error } = await service
    .from('profiles')
    .select('google_access_token, google_refresh_token, google_token_expiry, google_calendar_id')
    .eq('id', userId)
    .single<GoogleTokenRow>()

  if (error || !profile?.google_access_token) {
    throw new Error('Google Calendar not connected for this user')
  }

  const expiryMs = profile.google_token_expiry
    ? new Date(profile.google_token_expiry).getTime()
    : 0

  // Refresh if the token expires within the next 60 seconds
  if (Date.now() >= expiryMs - 60_000) {
    if (!profile.google_refresh_token) {
      throw new Error('No refresh token available — user must reconnect Google Calendar')
    }

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: profile.google_refresh_token,
        grant_type: 'refresh_token',
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Failed to refresh Google token: ${err}`)
    }

    const tokens = await res.json() as { access_token: string; expires_in: number }
    const newExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    await service.from('profiles').update({
      google_access_token: tokens.access_token,
      google_token_expiry: newExpiry,
    }).eq('id', userId)

    return tokens.access_token
  }

  return profile.google_access_token
}

/**
 * Sync a single job visit to Google Calendar, creating or updating the event.
 * Stores the resulting event ID in calendar_sync_log.
 */
export async function syncVisitToCalendar(visitId: string, userId: string): Promise<void> {
  const service = createServiceClient()

  // Fetch visit with nested job and customer
  const { data: visit, error: visitErr } = await service
    .from('job_visits')
    .select('*, jobs(*, customers(*))')
    .eq('id', visitId)
    .single()

  if (visitErr || !visit) {
    throw new Error(`Visit not found: ${visitId}`)
  }

  const job = visit.jobs as { title: string; description: string | null; company_id: string; customers: { name: string } | null } | null
  if (!job) throw new Error(`Visit ${visitId} has no associated job`)

  const accessToken = await getValidToken(userId)

  const calendarId = await getUserCalendarId(userId)

  // Check if we already have a synced event for this visit
  const { data: existingLog } = await service
    .from('calendar_sync_log')
    .select('google_event_id')
    .eq('job_visit_id', visitId)
    .maybeSingle()

  const eventBody = {
    summary: job.title,
    description: [
      job.description ?? '',
      job.customers ? `Customer: ${job.customers.name}` : '',
      visit.notes ? `Notes: ${visit.notes}` : '',
    ].filter(Boolean).join('\n'),
    start: {
      dateTime: visit.scheduled_start,
      timeZone: 'Pacific/Auckland',
    },
    end: {
      dateTime: visit.scheduled_end,
      timeZone: 'Pacific/Auckland',
    },
  }

  let googleEventId: string

  if (existingLog?.google_event_id) {
    // Update existing event
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(existingLog.google_event_id)}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      }
    )
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Failed to update Google Calendar event: ${err}`)
    }
    const updated = await res.json() as { id: string }
    googleEventId = updated.id

    await service
      .from('calendar_sync_log')
      .update({ synced_at: new Date().toISOString() })
      .eq('job_visit_id', visitId)
  } else {
    // Create new event
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      }
    )
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Failed to create Google Calendar event: ${err}`)
    }
    const created = await res.json() as { id: string }
    googleEventId = created.id

    await service.from('calendar_sync_log').insert({
      company_id: job.company_id,
      job_visit_id: visitId,
      google_event_id: googleEventId,
      direction: 'push',
    })
  }
}

/**
 * Delete a Google Calendar event.
 */
export async function deleteCalendarEvent(eventId: string, accessToken: string): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )
  // 404 means it was already deleted — treat as success
  if (!res.ok && res.status !== 404) {
    const err = await res.text()
    throw new Error(`Failed to delete Google Calendar event: ${err}`)
  }
}

async function getUserCalendarId(userId: string): Promise<string> {
  const service = createServiceClient()
  const { data } = await service
    .from('profiles')
    .select('google_calendar_id')
    .eq('id', userId)
    .single<{ google_calendar_id: string | null }>()
  return data?.google_calendar_id ?? 'primary'
}
