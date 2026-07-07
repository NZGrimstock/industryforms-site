import type { SupabaseClient } from '@supabase/supabase-js'

export async function logAdminAction(
  service: SupabaseClient,
  params: { adminId: string; action: string; targetType?: string; targetId?: string; details?: Record<string, unknown> }
) {
  await service.from('admin_audit_log').insert({
    admin_id: params.adminId,
    action: params.action,
    target_type: params.targetType ?? null,
    target_id: params.targetId ?? null,
    details: params.details ?? null,
  })
}
