import type { SubscriptionStatus } from '@/types';

/**
 * Map Lemon Squeezy subscription status to our internal status.
 * LS uses British spelling "cancelled"; we use American "canceled".
 */
export function mapLsStatus(lsStatus: string): SubscriptionStatus {
  const map: Record<string, SubscriptionStatus> = {
    active: 'active',
    on_trial: 'trialing',
    paused: 'paused',
    past_due: 'past_due',
    cancelled: 'canceled',
    expired: 'expired',
    unpaid: 'unpaid',
  };
  return map[lsStatus] ?? 'canceled';
}
