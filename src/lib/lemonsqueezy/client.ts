import { lemonSqueezySetup } from '@lemonsqueezy/lemonsqueezy.js';

let _initialized = false;

/** Initialize the LS SDK once (safe to call multiple times). */
export function initLemonSqueezy() {
  if (!_initialized) {
    lemonSqueezySetup({ apiKey: process.env.LEMONSQUEEZY_API_KEY! });
    _initialized = true;
  }
}
