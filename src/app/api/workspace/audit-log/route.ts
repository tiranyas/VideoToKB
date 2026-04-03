import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveWorkspaceId, getUserWorkspaceRole } from '@/lib/supabase/queries';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const workspaceId = url.searchParams.get('workspaceId');

  if (!workspaceId) {
    // Fall back to active workspace
    const activeId = await getActiveWorkspaceId(supabase, user.id);
    if (!activeId) {
      return NextResponse.json({ error: 'No active workspace' }, { status: 400 });
    }
    return fetchAuditLog(supabase, user.id, activeId);
  }

  return fetchAuditLog(supabase, user.id, workspaceId);
}

async function fetchAuditLog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  workspaceId: string
) {
  // Verify user is a member of this workspace
  const role = await getUserWorkspaceRole(supabase, workspaceId, userId);
  if (!role) {
    return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 });
  }

  const admin = getAdminClient();

  // Fetch last 100 audit log entries with user emails
  const { data, error } = await admin
    .from('workspace_audit_log')
    .select('id, user_id, action, details, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 });
  }

  // Resolve user emails for display
  const userIds = [...new Set((data ?? []).map(e => e.user_id))];
  const emailMap: Record<string, string> = {};

  for (const uid of userIds) {
    const { data: userData } = await admin.auth.admin.getUserById(uid);
    if (userData?.user?.email) {
      emailMap[uid] = userData.user.email;
    }
  }

  const entries = (data ?? []).map(entry => ({
    id: entry.id,
    action: entry.action,
    details: entry.details,
    createdAt: entry.created_at,
    userEmail: emailMap[entry.user_id] ?? entry.user_id,
  }));

  return NextResponse.json({ entries });
}
