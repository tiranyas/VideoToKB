import { createClient } from '@/lib/supabase/server';
import { initLemonSqueezy } from '@/lib/lemonsqueezy/client';
import { listSubscriptionInvoices } from '@lemonsqueezy/lemonsqueezy.js';
import { rateLimit } from '@/lib/rate-limit';

const limiter = rateLimit({ tokens: 10, interval: 60_000 });

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

  // Get user's LS subscription ID from DB
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('ls_subscription_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!sub?.ls_subscription_id) {
    return Response.json({ invoices: [] });
  }

  initLemonSqueezy();

  const { data, error } = await listSubscriptionInvoices({
    filter: { subscriptionId: Number(sub.ls_subscription_id) },
  });

  if (error) {
    console.error('[Billing] Failed to list invoices:', error);
    return Response.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }

  const invoices = (data?.data ?? []).map((inv) => ({
    id: inv.id,
    status: inv.attributes.status,
    total: inv.attributes.total,
    subtotal: inv.attributes.subtotal,
    tax: inv.attributes.tax,
    currency: inv.attributes.currency,
    billingReason: inv.attributes.billing_reason,
    cardBrand: inv.attributes.card_brand,
    cardLastFour: inv.attributes.card_last_four,
    invoiceUrl: inv.attributes.urls?.invoice_url ?? null,
    createdAt: inv.attributes.created_at,
  }));

  return Response.json({ invoices });
}
