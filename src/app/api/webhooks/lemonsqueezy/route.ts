import { type SupabaseClient } from '@supabase/supabase-js';
import { getAdminClient } from '@/lib/supabase/admin';
import { verifyWebhookSignature } from '@/lib/lemonsqueezy/verify-webhook';
import { mapLsStatus } from '@/lib/lemonsqueezy/status-map';
import {
  VARIANT_MAP,
  ARTICLE_PACK_VARIANT_ID,
  ARTICLE_PACK_CREDITS,
} from '@/lib/lemonsqueezy/config';
import { sendPaymentFailedAlert } from '@/lib/email';
import type { PlanId } from '@/types';

// ── Webhook route ───────────────────────────────────────────────

export async function POST(req: Request) {
  // 1. Read raw body for HMAC verification (must NOT parse first)
  const rawBody = await req.text();
  const signature = req.headers.get('X-Signature') ?? '';
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

  if (!secret) {
    console.error('[LS Webhook] LEMONSQUEEZY_WEBHOOK_SECRET not set');
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    console.error('[LS Webhook] Invalid signature');
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // 2. Parse payload
  let payload: LsWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventName = payload.meta.event_name;
  const userId: string | undefined = payload.meta.custom_data?.user_id;

  console.log(`[LS Webhook] Event: ${eventName}, user_id: ${userId ?? 'none'}`);

  // 3. Route by event
  const admin = getAdminClient();

  try {
    switch (eventName) {
      case 'subscription_created':
      case 'subscription_updated':
      case 'subscription_resumed':
      case 'subscription_unpaused':
        await handleSubscriptionUpsert(admin, payload, userId);
        break;

      case 'subscription_cancelled':
      case 'subscription_expired':
        await handleSubscriptionEnd(admin, payload, userId);
        break;

      case 'subscription_paused':
        await handleSubscriptionPause(admin, payload, userId);
        break;

      case 'subscription_payment_failed':
        await handlePaymentFailed(admin, payload, userId);
        break;

      case 'subscription_payment_success':
      case 'subscription_payment_recovered':
        // Status changes are already handled by subscription_updated
        console.log(`[LS Webhook] Payment event: ${eventName} — no action needed`);
        break;

      case 'order_created':
        await handleOrderCreated(admin, payload, userId);
        break;

      case 'order_refunded':
        await handleOrderRefunded(admin, payload, userId);
        break;

      default:
        console.log(`[LS Webhook] Unhandled event: ${eventName}`);
    }
  } catch (err) {
    console.error(`[LS Webhook] Error handling ${eventName}:`, err);
    // Return 500 so LS retries
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }

  return Response.json({ received: true });
}

// ── Event handlers ──────────────────────────────────────────────

async function handleSubscriptionUpsert(
  admin: SupabaseClient,
  payload: LsWebhookPayload,
  userId: string | undefined
) {
  if (!userId) {
    console.error('[LS Webhook] subscription_upsert: no user_id in custom_data');
    return;
  }

  const attrs = payload.data.attributes;
  const variantId = attrs.variant_id;
  const mapping = VARIANT_MAP[variantId];

  if (!mapping) {
    console.error(`[LS Webhook] Unknown variant_id: ${variantId}`);
    return;
  }

  const status = mapLsStatus(attrs.status);
  const now = new Date().toISOString();

  const { error } = await admin
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        plan_id: mapping.planId,
        status,
        ls_subscription_id: String(payload.data.id),
        ls_customer_id: String(attrs.customer_id),
        ls_variant_id: variantId,
        billing_interval: mapping.interval,
        customer_portal_url: attrs.urls?.customer_portal ?? null,
        current_period_start: attrs.current_period_start ?? now,
        current_period_end: attrs.renews_at ?? attrs.ends_at ?? now,
        updated_at: now,
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    throw new Error(`Failed to upsert subscription: ${error.message}`);
  }

  console.log(`[LS Webhook] Subscription upserted: user=${userId}, plan=${mapping.planId}, status=${status}`);
}

async function handleSubscriptionEnd(
  admin: SupabaseClient,
  payload: LsWebhookPayload,
  userId: string | undefined
) {
  if (!userId) return;

  const attrs = payload.data.attributes;
  const status = mapLsStatus(attrs.status);

  const { error } = await admin
    .from('subscriptions')
    .update({
      status,
      current_period_end: attrs.ends_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to update subscription end: ${error.message}`);
  }

  // If expired (period over), downgrade to free
  if (attrs.status === 'expired') {
    await admin
      .from('subscriptions')
      .update({ plan_id: 'free', ls_subscription_id: null, ls_variant_id: null })
      .eq('user_id', userId);

    console.log(`[LS Webhook] User ${userId} downgraded to free (expired)`);
  } else {
    console.log(`[LS Webhook] Subscription ${attrs.status}: user=${userId} (access until period end)`);
  }
}

async function handleSubscriptionPause(
  admin: SupabaseClient,
  payload: LsWebhookPayload,
  userId: string | undefined
) {
  if (!userId) return;

  const { error } = await admin
    .from('subscriptions')
    .update({
      status: 'paused',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to pause subscription: ${error.message}`);
  console.log(`[LS Webhook] Subscription paused: user=${userId}`);
}

async function handlePaymentFailed(
  admin: SupabaseClient,
  payload: LsWebhookPayload,
  userId: string | undefined
) {
  if (!userId) return;

  const { error } = await admin
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to mark past_due: ${error.message}`);
  console.log(`[LS Webhook] Payment failed: user=${userId} set to past_due`);

  // Send payment failure alert email (non-blocking)
  const portalUrl = payload.data.attributes.urls?.customer_portal;
  const { data: userData } = await admin.auth.admin.getUserById(userId);
  if (userData?.user?.email) {
    sendPaymentFailedAlert(userData.user.email, portalUrl).catch(console.error);
  }
}

async function handleOrderCreated(
  admin: SupabaseClient,
  payload: LsWebhookPayload,
  userId: string | undefined
) {
  if (!userId) return;

  // Check if this is an article pack one-time purchase
  const variantId = payload.data.attributes.first_order_item?.variant_id
    ?? payload.data.attributes.variant_id;

  if (variantId === ARTICLE_PACK_VARIANT_ID) {
    // Read current credits, then increment
    const { data: sub } = await admin
      .from('subscriptions')
      .select('bonus_credits')
      .eq('user_id', userId)
      .single();

    if (sub) {
      const { error } = await admin
        .from('subscriptions')
        .update({ bonus_credits: (sub.bonus_credits ?? 0) + ARTICLE_PACK_CREDITS })
        .eq('user_id', userId);

      if (error) throw new Error(`Failed to add bonus credits: ${error.message}`);
    }

    console.log(`[LS Webhook] Article pack purchased: +${ARTICLE_PACK_CREDITS} credits for user=${userId}`);
  }
  // Subscription orders are handled by subscription_created event
}

async function handleOrderRefunded(
  admin: SupabaseClient,
  payload: LsWebhookPayload,
  userId: string | undefined
) {
  if (!userId) return;

  const variantId = payload.data.attributes.first_order_item?.variant_id
    ?? payload.data.attributes.variant_id;

  if (variantId === ARTICLE_PACK_VARIANT_ID) {
    // Decrement bonus credits
    const { data: sub } = await admin
      .from('subscriptions')
      .select('bonus_credits')
      .eq('user_id', userId)
      .single();

    if (sub) {
      const newCredits = Math.max(0, (sub.bonus_credits ?? 0) - ARTICLE_PACK_CREDITS);
      await admin
        .from('subscriptions')
        .update({ bonus_credits: newCredits })
        .eq('user_id', userId);
    }

    console.log(`[LS Webhook] Article pack refunded: -${ARTICLE_PACK_CREDITS} credits for user=${userId}`);
  }
}

// ── Lemon Squeezy webhook payload types ─────────────────────────

interface LsWebhookPayload {
  meta: {
    event_name: string;
    custom_data?: {
      user_id?: string;
    };
  };
  data: {
    id: string;
    attributes: {
      status: string;
      variant_id: number;
      customer_id: number;
      order_id?: number;
      product_id?: number;
      product_name?: string;
      variant_name?: string;
      current_period_start?: string;
      renews_at?: string;
      ends_at?: string;
      trial_ends_at?: string;
      urls?: {
        customer_portal?: string;
        update_payment_method?: string;
      };
      first_order_item?: {
        variant_id: number;
      };
    };
  };
}
