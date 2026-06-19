'use client'
import { PowerSyncDatabase } from '@powersync/web'
import { AppSchema } from './schema'

let _db: PowerSyncDatabase | null = null

export function getPowerSyncDb(): PowerSyncDatabase | null {
  if (typeof window === 'undefined' || !window.isSecureContext) return null
  if (!_db) {
    _db = new PowerSyncDatabase({
      schema: AppSchema,
      database: { dbFilename: 'tradiee.db' },
      flags: { enableMultiTabs: false },
    })
  }
  return _db
}
