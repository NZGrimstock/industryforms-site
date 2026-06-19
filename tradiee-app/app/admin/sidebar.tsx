'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, CreditCard, BarChart3, Settings, ShieldAlert, Wrench } from 'lucide-react'

const nav = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/companies', label: 'Companies', icon: Users },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()
  return (
    <aside className="fixed inset-y-0 left-0 w-52 bg-gray-900 border-r border-gray-800 flex flex-col z-40">
      <div className="h-16 flex items-center px-5 border-b border-gray-800 gap-2">
        <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
          <Wrench className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-tight">IndustryForms</p>
          <p className="text-orange-400 text-[10px] font-medium flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" /> Admin
          </p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = href === '/admin' ? pathname === href : pathname.startsWith(href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    active ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-800">
        <Link href="/dashboard" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
          ← Back to app
        </Link>
      </div>
    </aside>
  )
}
