'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

export function TestModeBanner() {
  const router = useRouter()
  const [disabling, setDisabling] = useState(false)

  async function disable() {
    setDisabling(true)
    await fetch('/api/test-mode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'disable' }) })
    router.refresh()
    setDisabling(false)
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 select-none"
      style={{
        background: 'repeating-linear-gradient(-45deg, #fbbf24 0px, #fbbf24 18px, #1c1917 18px, #1c1917 36px)',
        minHeight: '40px',
      }}
    >
      <div className="flex-1" />
      <span
        className="font-black text-sm tracking-widest uppercase px-4 py-0.5 rounded"
        style={{ background: '#fbbf24', color: '#1c1917', letterSpacing: '0.25em' }}
      >
        ⚠ TEST MODE ⚠
      </span>
      <div className="flex-1 flex justify-end">
        <button
          onClick={disable}
          disabled={disabling}
          className="flex items-center gap-1.5 text-xs font-semibold bg-stone-900/70 hover:bg-stone-900 text-yellow-300 px-3 py-1 rounded transition-colors"
        >
          <X className="h-3 w-3" />
          {disabling ? 'Clearing…' : 'Exit test mode'}
        </button>
      </div>
    </div>
  )
}
