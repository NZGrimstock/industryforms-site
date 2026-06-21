'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { jobStatusBadgeClass } from '@/lib/job-statuses'
import { ChevronDown } from 'lucide-react'

type Status = { key: string; label: string; color: string }

// Inline, editable status badge for list rows. Click → pick a status → saves
// without leaving the list. Stops row-link navigation while open.
export function InlineStatus({ jobId, status, statuses }: { jobId: string; status: string; statuses: Status[] }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(status)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => setValue(status), [status])
  useEffect(() => {
    function onClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [])

  const current = statuses.find(s => s.key === value)

  async function pick(e: React.MouseEvent, key: string) {
    e.preventDefault(); e.stopPropagation()
    setOpen(false)
    if (key === value) return
    const prev = value
    setValue(key); setSaving(true)
    const { error } = await supabase.from('jobs').update({ status: key }).eq('id', jobId)
    setSaving(false)
    if (error) { setValue(prev); return }
    router.refresh()
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o) }}
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${jobStatusBadgeClass(current?.color ?? 'gray')} ${saving ? 'opacity-50' : 'hover:ring-1 hover:ring-gray-300'}`}
      >
        {current?.label ?? value}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 w-40 bg-white border border-gray-100 rounded-lg shadow-lg py-1">
          {statuses.map(s => (
            <button
              key={s.key}
              onClick={e => pick(e, s.key)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-gray-50 ${s.key === value ? 'font-semibold' : ''}`}
            >
              <span className={`w-2 h-2 rounded-full ${jobStatusBadgeClass(s.color).split(' ')[0]}`} />
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
