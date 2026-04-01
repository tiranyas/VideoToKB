import crypto from 'crypto';

/**
 * Verify Lemon Squeezy webhook signature (HMAC SHA-256).
 * Must be called with the raw request body string, NOT parsed JSON.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) return false;

  const hmac = crypto.createHmac('sha256', secret);
  const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
  const sig = Buffer.from(signature, 'utf8');

  if (digest.length !== sig.length) return false;

  return crypto.timingSafeEqual(digest, sig);
}
