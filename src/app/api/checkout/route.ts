import { createClient } from '@/lib/supabase/server';
import { lemonSqueezySetup, createCheckout } from '@lemonsqueezy/lemonsqueezy.js';
import { getStoreId, PLAN_VARIANTS, ARTICLE_PACK_VARIANT_ID } from '@/lib/lemonsqueezy/config';

export async function POST(req: Request) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse body
  let body: { planId?: string; interval?: string; isArticlePack?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { planId, interval, isArticlePack } = body;

  // Determine variant ID
  let variantId: number;
  if (isArticlePack) {
    variantId = ARTICLE_PACK_VARIANT_ID;
  } else {
    if (!planId || !interval) {
      return Response.json({ error: 'planId and interval are required' }, { status: 400 });
    }
    const key = `${planId}-${interval}`;
    const resolved = PLAN_VARIANTS[key];
    if (!resolved) {
      return Response.json({ error: 'Invalid plan or interval' }, { status: 400 });
    }
    variantId = resolved;
  }

  // Initialize LS SDK
  lemonSqueezySetup({ apiKey: process.env.LEMONSQUEEZY_API_KEY! });

  // Create checkout session
  try {
    const { data, error } = await createCheckout(getStoreId(), variantId, {
      checkoutData: {
        custom: { user_id: user.id } as Record<string, string>,
        email: user.email ?? undefined,
      },
      productOptions: {
        enabledVariants: [variantId],
      },
    });

    if (error) {
      console.error('[Checkout] LS API error:', error);
      return Response.json({ error: 'Failed to create checkout' }, { status: 500 });
    }

    const checkoutUrl = data?.data.attributes.url;
    if (!checkoutUrl) {
      return Response.json({ error: 'No checkout URL returned' }, { status: 500 });
    }

    return Response.json({ checkoutUrl });
  } catch (err) {
    console.error('[Checkout] Error:', err);
    return Response.json({ error: 'Failed to create checkout' }, { status: 500 });
  }
}
