import { createClient } from '@/lib/supabase/server';
import { createWorkspaceInvite, getUserWorkspaceRole, getUserSubscription } from '@/lib/supabase/queries';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { workspaceId, email, role } = await req.json();

  if (!workspaceId || !email) {
    return new Response(JSON.stringify({ error: 'workspaceId and email are required' }), { status: 400 });
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Invalid email address' }), { status: 400 });
  }

  // Check caller has admin+ role (getUserWorkspaceRole from Plan 02)
  const callerRole = await getUserWorkspaceRole(supabase, workspaceId, user.id);
  if (!callerRole || callerRole === 'member') {
    return new Response(JSON.stringify({ error: 'Only admins and owners can invite members' }), { status: 403 });
  }

  // Plan gating: only Team and Enterprise can invite
  const sub = await getUserSubscription(supabase, user.id);
  if (!sub || !['team', 'enterprise'].includes(sub.planId)) {
    return new Response(
      JSON.stringify({ error: 'Team invites require a Team or Enterprise plan. Please upgrade.' }),
      { status: 403 }
    );
  }

  try {
    const { token } = await createWorkspaceInvite(supabase, workspaceId, email, user.id, role || 'member');
    const inviteUrl = `${new URL(req.url).origin}/invite/accept?token=${token}`;
    return new Response(JSON.stringify({ token, inviteUrl }), { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create invite';
    const status = message.includes('already exists') ? 409 : 500;
    return new Response(JSON.stringify({ error: message }), { status });
  }
}
