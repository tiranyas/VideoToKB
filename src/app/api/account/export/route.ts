import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

const limiter = rateLimit({ tokens: 3, interval: 60_000 });

export async function GET() {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await limiter.check(user.id);
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const userId = user.id;

  try {
    // Fetch all user articles
    const { data: articles, error: articlesError } = await supabase
      .from('articles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (articlesError) {
      throw new Error(`Failed to fetch articles: ${articlesError.message}`);
    }

    // Fetch workspaces (includes company context)
    const { data: workspaces, error: wsError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (wsError) {
      throw new Error(`Failed to fetch workspaces: ${wsError.message}`);
    }

    // Fetch subscription info
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*, plans(name, article_limit)')
      .eq('user_id', userId)
      .maybeSingle();

    // Fetch workspace memberships
    const { data: memberships } = await supabase
      .from('workspace_members')
      .select('workspace_id, role, created_at')
      .eq('user_id', userId);

    // Fetch API keys (hashed only — never export raw keys)
    const { data: apiKeys } = await supabase
      .from('api_keys')
      .select('id, name, created_at, last_used_at')
      .eq('user_id', userId);

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
      },
      subscription: subscription ?? null,
      workspaces: workspaces ?? [],
      memberships: memberships ?? [],
      articles: articles ?? [],
      apiKeys: apiKeys ?? [],
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="kbpipe-data-export.json"',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
