import { createClient } from '@/lib/supabase/server';
import { getActiveWorkspaceId, getWorkspaceIntegrations, updateWorkspaceIntegrations } from '@/lib/supabase/queries';
import { testConnection, fetchCategories } from '@/lib/integrations/helpjuice';

export const dynamic = 'force-dynamic';

/**
 * GET /api/integrations/helpjuice
 * Fetch categories or check connection status
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = await getActiveWorkspaceId(supabase, user.id);
  if (!workspaceId) return Response.json({ error: 'No active workspace' }, { status: 400 });

  const integrations = await getWorkspaceIntegrations(supabase, workspaceId);
  const hj = integrations.helpjuice;
  if (!hj) return Response.json({ error: 'Helpjuice not connected' }, { status: 404 });

  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  try {
    if (action === 'status') {
      return Response.json({ connected: true, subdomain: hj.subdomain });
    }

    // Default: fetch categories
    const categories = await fetchCategories(hj.apiKey, hj.subdomain);
    return Response.json({ categories });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/helpjuice
 * Save credentials or test connection
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = await getActiveWorkspaceId(supabase, user.id);
  if (!workspaceId) return Response.json({ error: 'No active workspace' }, { status: 400 });

  const body = await req.json();
  const { apiKey, subdomain, action } = body as { apiKey: string; subdomain: string; action?: string };

  if (!apiKey || !subdomain) {
    return Response.json({ error: 'API key and subdomain are required' }, { status: 400 });
  }

  // Clean subdomain
  const cleanSubdomain = subdomain.replace(/\.helpjuice\.com.*$/, '').trim();

  if (action === 'test') {
    const result = await testConnection(apiKey, cleanSubdomain);
    return Response.json(result);
  }

  // Test first, then save
  const result = await testConnection(apiKey, cleanSubdomain);
  if (!result.ok) {
    return Response.json(result, { status: 400 });
  }

  const integrations = await getWorkspaceIntegrations(supabase, workspaceId);
  integrations.helpjuice = { apiKey, subdomain: cleanSubdomain };
  await updateWorkspaceIntegrations(supabase, workspaceId, integrations);

  return Response.json({ ok: true, subdomain: cleanSubdomain });
}

/**
 * DELETE /api/integrations/helpjuice
 * Disconnect Helpjuice
 */
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = await getActiveWorkspaceId(supabase, user.id);
  if (!workspaceId) return Response.json({ error: 'No active workspace' }, { status: 400 });

  const integrations = await getWorkspaceIntegrations(supabase, workspaceId);
  delete integrations.helpjuice;
  await updateWorkspaceIntegrations(supabase, workspaceId, integrations);

  return Response.json({ ok: true });
}
