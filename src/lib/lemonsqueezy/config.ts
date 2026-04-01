import type { PlanId } from '@/types';

// ── Variant → Plan mapping (used by webhook handler) ────────────

interface VariantMapping {
  planId: PlanId;
  interval: 'monthly' | 'yearly';
}

// Live variant IDs
const LIVE_VARIANT_MAP: Record<number, VariantMapping> = {
  1474420: { planId: 'starter', interval: 'monthly' },
  1474521: { planId: 'starter', interval: 'yearly' },
  1474542: { planId: 'team', interval: 'monthly' },
  1474548: { planId: 'team', interval: 'yearly' },
  1474553: { planId: 'enterprise', interval: 'monthly' },
  1474558: { planId: 'enterprise', interval: 'yearly' },
};

// Test mode variant IDs (Lemon Squeezy test mode has separate products)
const TEST_VARIANT_MAP: Record<number, VariantMapping> = {
  1474941: { planId: 'starter', interval: 'monthly' },
};

const LIVE_PLAN_VARIANTS: Record<string, number> = {
  'starter-monthly': 1474420,
  'starter-yearly': 1474521,
  'team-monthly': 1474542,
  'team-yearly': 1474548,
  'enterprise-monthly': 1474553,
  'enterprise-yearly': 1474558,
};

const TEST_PLAN_VARIANTS: Record<string, number> = {
  'starter-monthly': 1474941,
};

// Merge both maps — test IDs take priority when present in webhook lookups
export const VARIANT_MAP: Record<number, VariantMapping> = {
  ...LIVE_VARIANT_MAP,
  ...TEST_VARIANT_MAP,
};

// ── Plan + interval → Variant ID (used by checkout API) ─────────
// Uses test variants when LEMONSQUEEZY_TEST_MODE=true, otherwise live

const isTestMode = process.env.LEMONSQUEEZY_TEST_MODE === 'true';

export const PLAN_VARIANTS: Record<string, number> = isTestMode
  ? { ...LIVE_PLAN_VARIANTS, ...TEST_PLAN_VARIANTS }
  : LIVE_PLAN_VARIANTS;

// ── Article Pack add-on ─────────────────────────────────────────

export const ARTICLE_PACK_VARIANT_ID = 938159;
export const ARTICLE_PACK_CREDITS = 10;

// ── Store config ────────────────────────────────────────────────

export function getStoreId(): number {
  const id = process.env.LEMONSQUEEZY_STORE_ID;
  if (!id) throw new Error('LEMONSQUEEZY_STORE_ID is not set');
  return Number(id);
}
