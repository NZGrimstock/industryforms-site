import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { AdminSidebar } from './sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()
  const { data: profile } = await service.from('profiles').select('is_super_admin').eq('id', user.id).single()
  if (!profile?.is_super_admin) redirect('/dashboard')

  // Super-admin access requires two-factor auth. If they've never enrolled,
  // send them to enroll; if enrolled but this session hasn't completed the
  // aal2 challenge (e.g. an old cookie), send them back through login.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aal?.nextLevel === 'aal1') redirect('/settings?mfa_required=1')
  if (aal?.currentLevel !== 'aal2') redirect('/login?mfa_required=1')

  return (
    <div className="flex h-full min-h-screen bg-gray-950">
      <AdminSidebar />
      <main className="flex-1 ml-52 p-8">
        {children}
      </main>
    </div>
  )
}
