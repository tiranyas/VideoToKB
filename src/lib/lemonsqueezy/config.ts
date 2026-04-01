import type { PlanId } from '@/types';

// ── Variant → Plan mapping (used by webhook handler) ────────────

interface VariantMapping {
  planId: PlanId;
  interval: 'monthly' | 'yearly';
}

export const VARIANT_MAP: Record<number, VariantMapping> = {
  1474420: { planId: 'starter', interval: 'monthly' },
  1474521: { planId: 'starter', interval: 'yearly' },
  1474542: { planId: 'team', interval: 'monthly' },
  1474548: { planId: 'team', interval: 'yearly' },
  1474553: { planId: 'enterprise', interval: 'monthly' },
  1474558: { planId: 'enterprise', interval: 'yearly' },
};

// ── Plan + interval → Variant ID (used by checkout API) ─────────

export const PLAN_VARIANTS: Record<string, number> = {
  'starter-monthly': 1474420,
  'starter-yearly': 1474521,
  'team-monthly': 1474542,
  'team-yearly': 1474548,
  'enterprise-monthly': 1474553,
  'enterprise-yearly': 1474558,
};

// ── Article Pack add-on ─────────────────────────────────────────

export const ARTICLE_PACK_VARIANT_ID = 938159;
export const ARTICLE_PACK_CREDITS = 10;

// ── Store config ────────────────────────────────────────────────

export function getStoreId(): number {
  const id = process.env.LEMONSQUEEZY_STORE_ID;
  if (!id) throw new Error('LEMONSQUEEZY_STORE_ID is not set');
  return Number(id);
}
