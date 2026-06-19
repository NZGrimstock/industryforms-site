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

  return (
    <div className="flex h-full min-h-screen bg-gray-950">
      <AdminSidebar />
      <main className="flex-1 ml-52 p-8">
        {children}
      </main>
    </div>
  )
}
