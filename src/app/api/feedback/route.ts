import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const limiter = rateLimit({ tokens: 5, interval: 60_000 });

function getAdmin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const CATEGORIES = ['bug', 'quality', 'styling', 'feature', 'other'] as const;
const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await limiter.check(user.id);
  if (!rl.ok) {
    return Response.json(
      { error: 'Too many feedback submissions. Please try again later.' },
      { status: 429 }
    );
  }

  let body: {
    articleId?: string;
    workspaceId?: string;
    articleTypeId?: string;
    platformId?: string;
    platformName?: string;
    articleTitle?: string;
    category?: string;
    description?: string;
    expectedBehavior?: string;
    severity?: string;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.description?.trim()) {
    return Response.json({ error: 'Description is required' }, { status: 400 });
  }
  if (body.description.length > 5000) {
    return Response.json({ error: 'Description is too long' }, { status: 400 });
  }

  const category = CATEGORIES.includes(body.category as typeof CATEGORIES[number])
    ? body.category
    : 'bug';
  const severity = SEVERITIES.includes(body.severity as typeof SEVERITIES[number])
    ? body.severity
    : 'medium';

  // Use service role to bypass RLS (auth already verified above)
  const admin = getAdmin();
  const { error } = await admin.from('feedback').insert({
    user_id: user.id,
    article_id: body.articleId || null,
    workspace_id: body.workspaceId || null,
    article_type_id: body.articleTypeId || null,
    platform_id: body.platformId || null,
    platform_name: body.platformName || null,
    article_title: body.articleTitle || null,
    category,
    description: body.description.trim(),
    expected_behavior: body.expectedBehavior?.trim() || null,
    severity,
  });

  if (error) {
    console.error('Failed to save feedback:', error);
    return Response.json({ error: 'Failed to save feedback' }, { status: 500 });
  }

  return Response.json({ ok: true });
}
