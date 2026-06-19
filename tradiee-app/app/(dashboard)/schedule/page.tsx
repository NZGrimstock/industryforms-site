import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { ScheduleClient } from './client'

export default async function SchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('company_id, full_name, role').eq('id', user!.id).single()

  const from = new Date(Date.now() - 30 * 86400000).toISOString()
  const to = new Date(Date.now() + 60 * 86400000).toISOString()

  const [visitsRes, teamRes] = await Promise.all([
    supabase
      .from('job_visits')
      .select('*, jobs(id, job_number, title, customer_id, customers(name)), profiles(id, full_name)')
      .gte('scheduled_start', from)
      .lte('scheduled_start', to)
      .order('scheduled_start'),
    supabase.from('profiles').select('id, full_name').eq('company_id', profile!.company_id).eq('is_active', true).order('full_name'),
  ])

  return (
    <>
      <Header title="Schedule" profile={profile} />
      <ScheduleClient visits={visitsRes.data ?? []} team={teamRes.data ?? []} />
    </>
  )
}
