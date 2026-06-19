'use client'
import { cn } from '@/lib/utils'
import { useSidebar } from './sidebar-context'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar()
  return (
    <main className={cn(
      'flex-1 min-h-screen bg-gray-50 pb-16 md:pb-0 transition-all duration-200',
      // On mobile: no left margin (sidebar hidden)
      // On md+: match sidebar width (icon 3.5rem or full 14rem)
      collapsed ? 'md:ml-14' : 'md:ml-56'
    )}>
      {children}
    </main>
  )
}
