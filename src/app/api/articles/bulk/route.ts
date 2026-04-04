import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { getActiveWorkspaceId } from '@/lib/supabase/queries';

const limiter = rateLimit({ tokens: 5, interval: 60_000 });

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const rl = await limiter.check(user.id);
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { action, articleIds } = body as { action?: string; articleIds?: unknown };

  if (action !== 'delete') {
    return new Response(JSON.stringify({ error: 'Unsupported action' }), { status: 400 });
  }

  if (!Array.isArray(articleIds) || articleIds.length === 0) {
    return new Response(JSON.stringify({ error: 'articleIds must be a non-empty array' }), { status: 400 });
  }

  if (articleIds.length > 50) {
    return new Response(JSON.stringify({ error: 'Maximum 50 articles per request' }), { status: 400 });
  }

  // Validate every ID is a string (UUIDs)
  if (!articleIds.every((id) => typeof id === 'string')) {
    return new Response(JSON.stringify({ error: 'articleIds must be strings' }), { status: 400 });
  }

  // Scope delete to user's active workspace
  const workspaceId = await getActiveWorkspaceId(supabase, user.id);
  if (!workspaceId) {
    return new Response(JSON.stringify({ error: 'No active workspace' }), { status: 400 });
  }

  const { data, error } = await supabase
    .from('articles')
    .delete()
    .in('id', articleIds)
    .eq('user_id', user.id)
    .eq('workspace_id', workspaceId)
    .select('id');

  if (error) {
    console.error('[Bulk Delete] Failed:', error.message);
    return new Response(JSON.stringify({ error: 'Failed to delete articles' }), { status: 500 });
  }

  return new Response(JSON.stringify({ deleted: data?.length ?? 0 }), { status: 200 });
}
