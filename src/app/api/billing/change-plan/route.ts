import { createClient } from '@/lib/supabase/server';
import { initLemonSqueezy } from '@/lib/lemonsqueezy/client';
import { updateSubscription } from '@lemonsqueezy/lemonsqueezy.js';
import { rateLimit } from '@/lib/rate-limit';
import { PLAN_VARIANTS } from '@/lib/lemonsqueezy/config';

const limiter = rateLimit({ tokens: 5, interval: 60_000 });

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await limiter.check(user.id);
  if (!rl.ok) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: { planId?: string; interval?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { planId, interval } = body;
  if (!planId || !interval) {
    return Response.json({ error: 'planId and interval are required' }, { status: 400 });
  }

  // Resolve the new variant ID
  const key = `${planId}-${interval}`;
  const newVariantId = PLAN_VARIANTS[key];
  if (!newVariantId) {
    return Response.json({ error: 'Invalid plan or interval' }, { status: 400 });
  }

  // Get current subscription
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('ls_subscription_id, ls_variant_id, status, plan_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!sub?.ls_subscription_id) {
    return Response.json({ error: 'No active subscription. Please subscribe first.' }, { status: 400 });
  }

  if (sub.status !== 'active') {
    return Response.json({ error: 'Can only change plan on an active subscription' }, { status: 400 });
  }

  if (sub.ls_variant_id === newVariantId) {
    return Response.json({ error: 'You are already on this plan' }, { status: 400 });
  }

  initLemonSqueezy();

  const { error } = await updateSubscription(Number(sub.ls_subscription_id), {
    variantId: newVariantId,
  });

  if (error) {
    console.error('[Billing] Failed to change plan:', error);
    return Response.json({ error: 'Failed to change plan' }, { status: 500 });
  }

  // DB will be updated by the webhook (subscription_updated event)
  return Response.json({ ok: true });
}
