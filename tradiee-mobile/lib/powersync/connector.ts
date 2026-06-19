import {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
  UpdateType,
} from '@powersync/react-native'
import { supabase } from '../supabase'

export class SupabaseConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error || !session) throw new Error('Not authenticated')
    return {
      endpoint: process.env.EXPO_PUBLIC_POWERSYNC_URL!,
      token: session.access_token,
    }
  }

  async uploadData(database: AbstractPowerSyncDatabase) {
    const transaction = await database.getNextCrudTransaction()
    if (!transaction) return

    try {
      for (const op of transaction.crud) {
        const table = op.table
        const record = { ...op.opData, id: op.id } as Record<string, unknown>

        switch (op.op) {
          case UpdateType.PUT:
            await supabase.from(table).upsert(record)
            break
          case UpdateType.PATCH:
            await supabase.from(table).update(op.opData ?? {}).eq('id', op.id)
            break
          case UpdateType.DELETE:
            await supabase.from(table).delete().eq('id', op.id)
            break
        }
      }
      await transaction.complete()
    } catch (e) {
      console.error('[PowerSync upload]', e)
      throw e
    }
  }
}
