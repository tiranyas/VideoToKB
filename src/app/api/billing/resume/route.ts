import { createClient } from '@/lib/supabase/server';
import { initLemonSqueezy } from '@/lib/lemonsqueezy/client';
import { updateSubscription } from '@lemonsqueezy/lemonsqueezy.js';
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
    .select('ls_subscription_id, status, current_period_end')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!sub?.ls_subscription_id) {
    return Response.json({ error: 'No subscription found' }, { status: 400 });
  }

  if (sub.status !== 'canceled') {
    return Response.json({ error: 'Subscription is not in canceled state' }, { status: 400 });
  }

  // Can only resume during grace period (before period end)
  if (new Date(sub.current_period_end) < new Date()) {
    return Response.json({ error: 'Grace period has expired. Please start a new subscription.' }, { status: 400 });
  }

  initLemonSqueezy();

  const { error } = await updateSubscription(Number(sub.ls_subscription_id), {
    cancelled: false,
  });

  if (error) {
    console.error('[Billing] Failed to resume:', error);
    return Response.json({ error: 'Failed to resume subscription' }, { status: 500 });
  }

  // DB will be updated by the webhook (subscription_resumed event)
  return Response.json({ ok: true });
}
