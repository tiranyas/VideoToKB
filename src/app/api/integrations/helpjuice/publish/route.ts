import { createClient } from '@/lib/supabase/server';
import { getActiveWorkspaceId, getWorkspaceIntegrations } from '@/lib/supabase/queries';
import { publishDraft } from '@/lib/integrations/helpjuice';

export const dynamic = 'force-dynamic';

/**
 * POST /api/integrations/helpjuice/publish
 * Publish an article as draft to Helpjuice
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = await getActiveWorkspaceId(supabase, user.id);
  if (!workspaceId) return Response.json({ error: 'No active workspace' }, { status: 400 });

  const integrations = await getWorkspaceIntegrations(supabase, workspaceId);
  const hj = integrations.helpjuice;
  if (!hj) return Response.json({ error: 'Helpjuice not connected' }, { status: 400 });

  const body = await req.json();
  const { articleId, categoryId } = body as { articleId: string; categoryId: number };

  if (!articleId || !categoryId) {
    return Response.json({ error: 'articleId and categoryId are required' }, { status: 400 });
  }

  // Fetch article from DB
  const { data: article, error: fetchError } = await supabase
    .from('articles')
    .select('title, html')
    .eq('id', articleId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (fetchError || !article) {
    return Response.json({ error: 'Article not found' }, { status: 404 });
  }

  if (!article.html) {
    return Response.json({ error: 'Article has no HTML content. Generate HTML first.' }, { status: 400 });
  }

  try {
    const result = await publishDraft(hj.apiKey, hj.subdomain, {
      title: article.title,
      body: article.html,
      categoryId,
    });

    return Response.json({
      ok: true,
      helpjuiceArticleId: result.id,
      helpjuiceUrl: result.url,
      name: result.name,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to publish' },
      { status: 500 }
    );
  }
}
