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
    // Delete user_settings
    await supabase.from('user_settings').delete().eq('user_id', userId);

    // Delete workspaces (cascades to articles, workspace_preferences)
    const { error: wsError } = await supabase
      .from('workspaces')
      .delete()
      .eq('user_id', userId);

    if (wsError) {
      throw new Error(`Failed to delete workspaces: ${wsError.message}`);
    }

    // Clean up legacy tables (if they still exist)
    await supabase.from('articles').delete().eq('user_id', userId);
    await supabase.from('company_contexts').delete().eq('user_id', userId);
    await supabase.from('user_preferences').delete().eq('user_id', userId);

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
