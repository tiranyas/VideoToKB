import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function POST() {
  // Verify caller is authenticated admin
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // Use service role to bypass RLS
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { DEFAULT_PLATFORM_PROFILES } = await import('@/lib/templates/agent4-html');
  const { DEFAULT_ARTICLE_TYPES } = await import('@/lib/templates/agent2-draft');

  const profileRows = DEFAULT_PLATFORM_PROFILES.map((pp) => ({
    id: pp.id,
    name: pp.name,
    html_prompt: pp.htmlPrompt,
    html_template: pp.htmlTemplate,
    is_default: true,
  }));

  const typeRows = DEFAULT_ARTICLE_TYPES.map((at) => ({
    id: at.id,
    name: at.name,
    draft_prompt: at.draftPrompt,
    structure_prompt: at.structurePrompt,
    is_default: true,
  }));

  const { error: ppError } = await admin
    .from('platform_profiles')
    .upsert(profileRows, { onConflict: 'id' });

  const { error: atError } = await admin
    .from('article_types')
    .upsert(typeRows, { onConflict: 'id' });

  const errors = [ppError, atError].filter(Boolean);
  if (errors.length > 0) {
    return new Response(
      JSON.stringify({ error: errors.map((e) => e!.message).join('; ') }),
      { status: 500 }
    );
  }

  return Response.json({
    seeded: {
      platformProfiles: profileRows.length,
      articleTypes: typeRows.length,
    },
  });
}
