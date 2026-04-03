import { createClient } from '@/lib/supabase/server';
import { initLemonSqueezy } from '@/lib/lemonsqueezy/client';
import { cancelSubscription } from '@lemonsqueezy/lemonsqueezy.js';
import { rateLimit } from '@/lib/rate-limit';

const limiter = rateLimit({ tokens: 3, interval: 60_000 });

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await limiter.check(user.id);
  if (!rl.ok) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('ls_subscription_id, status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!sub?.ls_subscription_id) {
    return Response.json({ error: 'No active subscription found' }, { status: 400 });
  }

  if (sub.status === 'canceled' || sub.status === 'expired') {
    return Response.json({ error: 'Subscription is already canceled' }, { status: 400 });
  }

  initLemonSqueezy();

  const { error } = await cancelSubscription(Number(sub.ls_subscription_id));

  if (error) {
    console.error('[Billing] Failed to cancel:', error);
    return Response.json({ error: 'Failed to cancel subscription' }, { status: 500 });
  }

  // DB will be updated by the webhook (subscription_cancelled event)
  return Response.json({ ok: true });
}
