'use client'
import { useState } from 'react'
import { Sparkles } from 'lucide-react'

type Mode = 'description' | 'professional' | 'friendly' | 'shorter' | 'longer'

/**
 * Small AI rewrite affordance for any text field. Wraps the textarea/input so
 * the user clicks the button, sees a tone menu, then the chosen rewrite
 * replaces the value via the supplied onChange. No-ops if the current value
 * is blank.
 */
export function AIRewriteButton({
  value, onChange, disabled, className = '',
}: {
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<Mode | null>(null)

  async function rewrite(mode: Mode) {
    setOpen(false)
    if (!value.trim()) return
    setBusy(mode)
    try {
      const res = await fetch('/api/ai/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: value, mode }),
      })
      const json = await res.json()
      if (res.ok && json.improved) onChange(json.improved)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        disabled={disabled || !value.trim() || busy !== null}
        onClick={() => setOpen(o => !o)}
        title="Rewrite with AI"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 disabled:opacity-50 rounded-md px-2 py-1 transition-colors"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {busy ? 'Rewriting…' : 'AI rewrite'}
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-30">
          {([
            ['description', 'Clean & concise'],
            ['professional', 'More professional'],
            ['friendly', 'Friendly tone'],
            ['shorter', 'Shorter'],
            ['longer', 'More detail'],
          ] as const).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => rewrite(m)}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-violet-50"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
