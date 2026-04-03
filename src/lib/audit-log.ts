/**
 * Workspace audit log utility.
 * Records team activity for Team/Enterprise plans.
 *
 * Usage:
 *   import { logAudit } from '@/lib/audit-log';
 *   await logAudit(workspaceId, userId, 'article_created', { title: 'My Article' });
 */

import { getAdminClient } from '@/lib/supabase/admin';

export type AuditAction =
  | 'article_created'
  | 'article_deleted'
  | 'article_updated'
  | 'member_invited'
  | 'member_removed'
  | 'settings_updated'
  | 'workspace_created'
  | 'integration_connected'
  | 'integration_disconnected';

/** Fire-and-forget audit log entry. Never throws. */
export async function logAudit(
  workspaceId: string,
  userId: string,
  action: AuditAction,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const admin = getAdminClient();
    await admin.from('workspace_audit_log').insert({
      workspace_id: workspaceId,
      user_id: userId,
      action,
      details: details ?? {},
    });
  } catch (err) {
    // Audit logging should never block the main flow
    console.error('[AuditLog] Failed to log:', err);
  }
}
