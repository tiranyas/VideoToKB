import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function DELETE() {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user.id;

  try {
    // Delete all user's articles
    const { error: articlesError } = await supabase
      .from('articles')
      .delete()
      .eq('user_id', userId);

    if (articlesError) {
      throw new Error(`Failed to delete articles: ${articlesError.message}`);
    }

    // Delete user's company contexts
    const { error: contextError } = await supabase
      .from('company_contexts')
      .delete()
      .eq('user_id', userId);

    if (contextError) {
      throw new Error(`Failed to delete company context: ${contextError.message}`);
    }

    // Delete user's preferences
    const { error: prefsError } = await supabase
      .from('user_preferences')
      .delete()
      .eq('user_id', userId);

    if (prefsError) {
      throw new Error(`Failed to delete user preferences: ${prefsError.message}`);
    }

    // Delete the auth user using admin API (service role key bypasses RLS)
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: authError } = await adminSupabase.auth.admin.deleteUser(userId);

    if (authError) {
      throw new Error(`Failed to delete auth user: ${authError.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete account';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
