import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ADMIN_EMAILS = ['tiran@kbify.com', 'tiranyas@gmail.com'];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Get all subscriptions with user info
  const { data: subscriptions, error: subError } = await supabase
    .from('subscriptions')
    .select('*, plans(name, article_limit)')
    .order('created_at', { ascending: false });

  if (subError) {
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }

  // Get article counts per user
  const { data: articleCounts, error: acError } = await supabase
    .rpc('get_all_user_stats');

  if (acError) {
    // Fallback: if RPC doesn't exist, return subscriptions without stats
    return NextResponse.json({
      users: (subscriptions ?? []).map((sub) => ({
        userId: sub.user_id,
        planId: sub.plan_id,
        planName: sub.plans?.name ?? sub.plan_id,
        articleLimit: sub.plans?.article_limit ?? 0,
        status: sub.status,
        bonusCredits: sub.bonus_credits,
        currentPeriodStart: sub.current_period_start,
        currentPeriodEnd: sub.current_period_end,
        createdAt: sub.created_at,
        totalArticles: 0,
        articlesThisPeriod: 0,
      })),
    });
  }

  // Merge data
  const statsMap = new Map(
    (articleCounts ?? []).map((s: Record<string, unknown>) => [s.user_id, s])
  );

  const users = (subscriptions ?? []).map((sub) => {
    const stats = statsMap.get(sub.user_id) as Record<string, unknown> | undefined;
    return {
      userId: sub.user_id,
      email: stats?.email ?? sub.user_id,
      planId: sub.plan_id,
      planName: sub.plans?.name ?? sub.plan_id,
      articleLimit: sub.plans?.article_limit ?? 0,
      status: sub.status,
      bonusCredits: sub.bonus_credits,
      currentPeriodStart: sub.current_period_start,
      currentPeriodEnd: sub.current_period_end,
      createdAt: sub.created_at,
      totalArticles: Number(stats?.total_articles ?? 0),
      articlesThisPeriod: Number(stats?.articles_this_period ?? 0),
    };
  });

  return NextResponse.json({ users });
}
