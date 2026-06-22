'use client'
import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

interface TimePickerProps {
  value: string  // HH:MM (24h)
  onChange: (value: string) => void
  label?: string
  id?: string
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1)
const MINUTES = [0, 15, 30, 45]

function to24(h: number, m: number, ampm: 'AM' | 'PM') {
  let hour = h % 12
  if (ampm === 'PM') hour += 12
  return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function from24(value: string): { hour: number; minute: number; ampm: 'AM' | 'PM' } {
  if (!value) return { hour: 8, minute: 0, ampm: 'AM' }
  const [h, m] = value.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const hour = h % 12 || 12
  return { hour, minute: m, ampm }
}

export function TimePicker({ value, onChange, id }: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const { hour, minute, ampm } = from24(value)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function set(h: number, m: number, ap: 'AM' | 'PM') {
    onChange(to24(h, m, ap))
  }

  const display = value
    ? `${hour}:${String(minute).padStart(2, '0')} ${ampm}`
    : 'Select time'

  return (
    <div ref={ref} className="relative" id={id}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent,#f97316)] transition-colors"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>{display}</span>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-[180px]">
          <div className="flex gap-2">
            {/* Hours */}
            <div className="flex flex-col gap-0.5 flex-1">
              <p className="text-xs text-gray-400 font-medium mb-1 text-center">Hour</p>
              {HOURS.map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => set(h, minute, ampm)}
                  className={`text-sm py-1 rounded-md w-full transition-colors ${hour === h ? 'bg-[var(--accent,#f97316)] text-white font-semibold' : 'hover:bg-gray-100 text-gray-700'}`}
                >
                  {h}
                </button>
              ))}
            </div>

            {/* Minutes */}
            <div className="flex flex-col gap-0.5 flex-1">
              <p className="text-xs text-gray-400 font-medium mb-1 text-center">Min</p>
              {MINUTES.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => set(hour, m, ampm)}
                  className={`text-sm py-1 rounded-md w-full transition-colors ${minute === m ? 'bg-[var(--accent,#f97316)] text-white font-semibold' : 'hover:bg-gray-100 text-gray-700'}`}
                >
                  :{String(m).padStart(2, '0')}
                </button>
              ))}
            </div>

            {/* AM/PM */}
            <div className="flex flex-col gap-1">
              <p className="text-xs text-gray-400 font-medium mb-1 text-center">–</p>
              {(['AM', 'PM'] as const).map(ap => (
                <button
                  key={ap}
                  type="button"
                  onClick={() => { set(hour, minute, ap); setOpen(false) }}
                  className={`text-sm px-2 py-1 rounded-md transition-colors ${ampm === ap ? 'bg-[var(--accent,#f97316)] text-white font-semibold' : 'hover:bg-gray-100 text-gray-700'}`}
                >
                  {ap}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
