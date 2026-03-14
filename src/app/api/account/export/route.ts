import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Fetch company context
    const { data: companyContext, error: contextError } = await supabase
      .from('company_contexts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (contextError) {
      throw new Error(`Failed to fetch company context: ${contextError.message}`);
    }

    // Fetch user preferences
    const { data: preferences, error: prefsError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (prefsError) {
      throw new Error(`Failed to fetch user preferences: ${prefsError.message}`);
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
      },
      articles: articles ?? [],
      companyContext: companyContext ?? null,
      userPreferences: preferences ?? null,
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="kbify-data-export.json"',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
