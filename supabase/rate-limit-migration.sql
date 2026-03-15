-- Rate limit hits table for persistent sliding-window rate limiting.
-- Used by src/lib/rate-limit.ts to track API request counts
-- across serverless cold starts.

CREATE TABLE rate_limit_hits (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  identifier text NOT NULL,
  hit_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limit_hits_lookup ON rate_limit_hits (identifier, hit_at DESC);
