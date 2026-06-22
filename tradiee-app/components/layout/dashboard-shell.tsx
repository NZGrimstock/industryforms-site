'use client'
import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'
import { useSidebar } from './sidebar-context'
import { accentForPath } from '@/lib/route-accent'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar()
  const pathname = usePathname()
  const accent = accentForPath(pathname)
  // CSS variables consumed by Button (default variant) and any component that
  // wants a route-tinted accent without hard-coding orange.
  const style = {
    '--accent': accent.solid,
    '--accent-hover': accent.solidHover,
    '--accent-soft': accent.soft,
    '--accent-soft-text': accent.softText,
    '--accent-ring': accent.ring,
  } as React.CSSProperties
  return (
    <main
      style={style}
      className={cn(
        'flex-1 min-h-screen bg-gray-50 pb-16 md:pb-0 transition-all duration-200',
        // On mobile: no left margin (sidebar hidden)
        // On md+: match sidebar width (icon 3.5rem or full 14rem)
        collapsed ? 'md:ml-14' : 'md:ml-56'
      )}
    >
      {children}
    </main>
  )
}
