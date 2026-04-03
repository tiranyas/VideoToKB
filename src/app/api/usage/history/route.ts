import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 6 months ago from start of current month
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const sinceISO = sixMonthsAgo.toISOString();

  const { data, error } = await supabase
    .from('articles')
    .select('created_at')
    .eq('user_id', user.id)
    .gte('created_at', sinceISO)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch usage history:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch usage history' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Group by YYYY-MM in JS
  const counts = new Map<string, number>();

  // Pre-fill all 6 months so gaps show as 0
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    counts.set(key, 0);
  }

  for (const row of data ?? []) {
    const d = new Date(row.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const months = Array.from(counts.entries()).map(([month, count]) => ({
    month,
    count,
  }));

  return new Response(
    JSON.stringify({ months }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
