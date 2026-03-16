-- Feedback / Bug Reports table
CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id uuid REFERENCES public.articles(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,

  -- Context (auto-captured)
  article_type_id text,
  platform_id text,
  platform_name text,
  article_title text,

  -- User input
  category text NOT NULL DEFAULT 'bug' CHECK (category IN ('bug', 'quality', 'styling', 'feature', 'other')),
  description text NOT NULL,
  expected_behavior text,
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  -- Admin fields
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'wont_fix')),
  admin_notes text,

  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
  ON public.feedback FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything (for admin dashboard)
CREATE POLICY "Service role full access on feedback"
  ON public.feedback FOR ALL
  USING (auth.role() = 'service_role');

-- Index for admin queries
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON public.feedback(user_id, created_at DESC);

-- QA test runs table (internal platform health)
CREATE TABLE IF NOT EXISTS public.qa_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type text NOT NULL CHECK (run_type IN ('scheduled', 'manual', 'deploy')),

  -- Test results
  total_tests int NOT NULL DEFAULT 0,
  passed int NOT NULL DEFAULT 0,
  failed int NOT NULL DEFAULT 0,
  warnings int NOT NULL DEFAULT 0,

  -- Details (JSON array of test results)
  results jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Timing
  duration_ms int,
  created_at timestamptz DEFAULT now()
);

-- RLS — only service role
ALTER TABLE public.qa_test_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on qa_test_runs"
  ON public.qa_test_runs FOR ALL
  USING (auth.role() = 'service_role');
