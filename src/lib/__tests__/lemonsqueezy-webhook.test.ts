import { describe, it, expect } from 'vitest';
import { verifyWebhookSignature } from '../lemonsqueezy/verify-webhook';
import { mapLsStatus } from '../lemonsqueezy/status-map';
import { VARIANT_MAP, PLAN_VARIANTS, ARTICLE_PACK_VARIANT_ID } from '../lemonsqueezy/config';

// ── Signature Verification ──────────────────────────────────────

describe('verifyWebhookSignature', () => {
  const secret = 'test-secret-123';

  it('returns true for valid signature', () => {
    const body = '{"test":"data"}';
    // Generate expected signature manually
    const crypto = require('crypto');
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');

    expect(verifyWebhookSignature(body, expected, secret)).toBe(true);
  });

  it('returns false for invalid signature', () => {
    const body = '{"test":"data"}';
    expect(verifyWebhookSignature(body, 'invalid-signature', secret)).toBe(false);
  });

  it('returns false for empty signature', () => {
    expect(verifyWebhookSignature('body', '', secret)).toBe(false);
  });

  it('returns false for empty secret', () => {
    expect(verifyWebhookSignature('body', 'sig', '')).toBe(false);
  });

  it('returns false for tampered body', () => {
    const body = '{"test":"data"}';
    const crypto = require('crypto');
    const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');

    // Tamper body
    expect(verifyWebhookSignature('{"test":"tampered"}', sig, secret)).toBe(false);
  });
});

// ── Status Mapping ──────────────────────────────────────────────

describe('mapLsStatus', () => {
  it('maps active correctly', () => {
    expect(mapLsStatus('active')).toBe('active');
  });

  it('maps on_trial to trialing', () => {
    expect(mapLsStatus('on_trial')).toBe('trialing');
  });

  it('maps cancelled (British) to canceled (American)', () => {
    expect(mapLsStatus('cancelled')).toBe('canceled');
  });

  it('maps paused correctly', () => {
    expect(mapLsStatus('paused')).toBe('paused');
  });

  it('maps past_due correctly', () => {
    expect(mapLsStatus('past_due')).toBe('past_due');
  });

  it('maps expired correctly', () => {
    expect(mapLsStatus('expired')).toBe('expired');
  });

  it('maps unpaid correctly', () => {
    expect(mapLsStatus('unpaid')).toBe('unpaid');
  });

  it('defaults unknown status to canceled', () => {
    expect(mapLsStatus('some_unknown_status')).toBe('canceled');
  });
});

// ── Config ──────────────────────────────────────────────────────

describe('Variant config', () => {
  it('maps all 6 subscription variant IDs', () => {
    expect(Object.keys(VARIANT_MAP)).toHaveLength(6);
  });

  it('maps Starter monthly correctly', () => {
    expect(VARIANT_MAP[1474420]).toEqual({ planId: 'starter', interval: 'monthly' });
  });

  it('maps Enterprise yearly correctly', () => {
    expect(VARIANT_MAP[1474558]).toEqual({ planId: 'enterprise', interval: 'yearly' });
  });

  it('has reverse mapping for all plans', () => {
    expect(PLAN_VARIANTS['starter-monthly']).toBe(1474420);
    expect(PLAN_VARIANTS['starter-yearly']).toBe(1474521);
    expect(PLAN_VARIANTS['team-monthly']).toBe(1474542);
    expect(PLAN_VARIANTS['team-yearly']).toBe(1474548);
    expect(PLAN_VARIANTS['enterprise-monthly']).toBe(1474553);
    expect(PLAN_VARIANTS['enterprise-yearly']).toBe(1474558);
  });

  it('has article pack variant ID', () => {
    expect(ARTICLE_PACK_VARIANT_ID).toBe(938159);
  });

  it('variant map and plan variants are consistent', () => {
    for (const [key, variantId] of Object.entries(PLAN_VARIANTS)) {
      const mapping = VARIANT_MAP[variantId];
      expect(mapping).toBeDefined();
      const [planId, interval] = key.split('-');
      expect(mapping.planId).toBe(planId);
      expect(mapping.interval).toBe(interval);
    }
  });
});
