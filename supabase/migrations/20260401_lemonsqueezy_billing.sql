-- ============================================================
-- Lemon Squeezy Billing Migration
-- Replaces Stripe fields with LS fields, updates plan data
-- ============================================================

-- 1. Replace Stripe columns with Lemon Squeezy columns
ALTER TABLE subscriptions
  DROP COLUMN IF EXISTS stripe_subscription_id,
  DROP COLUMN IF EXISTS stripe_customer_id;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS ls_subscription_id text,
  ADD COLUMN IF NOT EXISTS ls_customer_id text,
  ADD COLUMN IF NOT EXISTS ls_variant_id integer,
  ADD COLUMN IF NOT EXISTS billing_interval text DEFAULT 'monthly'
    CHECK (billing_interval IN ('monthly', 'yearly')),
  ADD COLUMN IF NOT EXISTS customer_portal_url text;

-- Index for fast webhook lookups by LS subscription ID
CREATE INDEX IF NOT EXISTS idx_subscriptions_ls_sub_id
  ON subscriptions (ls_subscription_id)
  WHERE ls_subscription_id IS NOT NULL;

-- 2. Deactivate old plans that no longer exist
UPDATE plans SET is_active = false WHERE id IN ('pro', 'business');

-- 3. Upsert correct plan data to match Lemon Squeezy products
INSERT INTO plans (id, name, price_cents, article_limit, description, is_active, sort_order)
VALUES
  ('free',       'Free',       0,     3,   'Perfect to try KBPipe',                true, 0),
  ('starter',    'Starter',    2999,  30,  'For creators and solo teams',           true, 1),
  ('team',       'Team',       3499,  30,  'Centralized billing, shared workspace', true, 2),
  ('enterprise', 'Enterprise', 29999, 300, 'For organizations with custom needs',   true, 3)
ON CONFLICT (id) DO UPDATE SET
  name          = EXCLUDED.name,
  price_cents   = EXCLUDED.price_cents,
  article_limit = EXCLUDED.article_limit,
  description   = EXCLUDED.description,
  is_active     = EXCLUDED.is_active,
  sort_order    = EXCLUDED.sort_order;

-- 4. Add subscription status values for LS lifecycle
-- The CHECK constraint on status needs to allow new LS statuses
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'paused', 'expired', 'unpaid'));
