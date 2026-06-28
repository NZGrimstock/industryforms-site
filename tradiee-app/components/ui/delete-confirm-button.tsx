'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

interface Props {
  id: string
  table: string
  label?: string
  redirectTo?: string
  className?: string
}

export function DeleteConfirmButton({ id, table, label = 'record', redirectTo, className }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete this ${label}? This cannot be undone.`)) return
    setLoading(true)
    const res = await fetch('/api/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, id }),
    })
    if (!res.ok) {
      const { error } = await res.json()
      alert(error ?? 'Delete failed')
      setLoading(false)
      return
    }
    if (redirectTo) router.push(redirectTo)
    else router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title={`Delete ${label}`}
      className={className ?? 'h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-40'}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}
