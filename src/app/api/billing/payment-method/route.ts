import { createClient } from '@/lib/supabase/server';
import { initLemonSqueezy } from '@/lib/lemonsqueezy/client';
import { getSubscription } from '@lemonsqueezy/lemonsqueezy.js';
import { rateLimit } from '@/lib/rate-limit';

const limiter = rateLimit({ tokens: 5, interval: 60_000 });

export async function GET() {
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
    .select('ls_subscription_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!sub?.ls_subscription_id) {
    return Response.json({ error: 'No active subscription found' }, { status: 400 });
  }

  initLemonSqueezy();

  // Fetch fresh subscription data from LS to get a valid pre-signed URL (24h expiry)
  const { data, error } = await getSubscription(Number(sub.ls_subscription_id));

  if (error) {
    console.error('[Billing] Failed to get subscription:', error);
    return Response.json({ error: 'Failed to get payment method URL' }, { status: 500 });
  }

  const url = data?.data.attributes.urls?.update_payment_method ?? null;

  if (!url) {
    return Response.json({ error: 'Payment method update not available' }, { status: 400 });
  }

  return Response.json({ url });
}
