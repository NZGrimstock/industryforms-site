import { cn, statusColor, statusLabel } from '@/lib/utils'

interface BadgeProps {
  status: string
  className?: string
  label?: string
}

export function StatusBadge({ status, className, label }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', statusColor(status), className)}>
      {label ?? statusLabel(status)}
    </span>
  )
}

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700', className)}>
      {children}
    </span>
  )
}
