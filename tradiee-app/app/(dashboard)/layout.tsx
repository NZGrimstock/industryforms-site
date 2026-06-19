import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { SidebarProvider } from '@/components/layout/sidebar-context'
import { PowerSyncProvider } from '@/components/providers/powersync-provider'
import { SyncStatusBar } from '@/components/ui/sync-status-bar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <PowerSyncProvider>
      <SidebarProvider>
        <div className="flex h-full">
          <Sidebar />
          <DashboardShell>
            <SyncStatusBar />
            {children}
          </DashboardShell>
        </div>
        <MobileNav />
      </SidebarProvider>
    </PowerSyncProvider>
  )
}
