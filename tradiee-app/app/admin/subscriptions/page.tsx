import { createServiceClient } from '@/lib/supabase/server'
import { SubscriptionsClient } from './client'

export default async function AdminSubscriptions() {
  const s = createServiceClient()
  const { data: companies } = await s
    .from('companies')
    .select('id, name, subscription_plan, subscription_status, trial_ends_at, stripe_customer_id, created_at')
    .order('created_at', { ascending: false })

  return <SubscriptionsClient companies={companies ?? []} />
}
