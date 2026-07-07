import { createServiceClient } from '@/lib/supabase/server'
import { DeletionRequestsClient } from './client'

export default async function AdminDeletionRequests() {
  const s = createServiceClient()
  const { data: requests } = await s
    .from('account_deletion_requests')
    .select('id, email, full_name, phone, business_name, reason, status, matched_profile_id, matched_company_id, created_at, reviewed_at, internal_notes')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Deletion requests</h1>
        <p className="text-gray-400 text-sm mt-1">{requests?.length ?? 0} requests — GDPR/Privacy Act right-to-erasure queue</p>
      </div>
      <DeletionRequestsClient requests={requests ?? []} />
    </div>
  )
}
