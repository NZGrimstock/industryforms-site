'use client'
import { useEffect, useState } from 'react'
import { PowerSyncContext } from '@powersync/react'
import { PowerSyncDatabase } from '@powersync/web'
import { SupabaseConnector } from '@/lib/powersync/connector'

export function PowerSyncProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<PowerSyncDatabase | null>(null)

  useEffect(() => {
    let mounted = true
    const connector = new SupabaseConnector()

    import('@/lib/powersync/database').then(({ getPowerSyncDb }) => {
      if (!mounted) return
      const database = getPowerSyncDb()
      if (!database) return
      database.connect(connector)
      setDb(database)
    })

    return () => {
      mounted = false
    }
  }, [])

  // Children render immediately — no PowerSync context until DB is ready.
  // Existing server-rendered content stays visible; offline mutations become
  // available once the DB initialises (usually < 100ms).
  if (!db) return <>{children}</>

  return (
    <PowerSyncContext.Provider value={db}>
      {children}
    </PowerSyncContext.Provider>
  )
}
