-- Support chat: pgvector, docs, conversations, messages, RPC search

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Support docs
CREATE TABLE IF NOT EXISTS public.support_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  category text NOT NULL,
  content text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Chunked docs for search
CREATE TABLE IF NOT EXISTS public.support_doc_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id uuid NOT NULL REFERENCES support_docs(id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  content text NOT NULL,
  token_count int NOT NULL DEFAULT 0,
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  embedding extensions.vector(1536),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sdc_doc ON support_doc_chunks(doc_id);
CREATE INDEX IF NOT EXISTS idx_sdc_search ON support_doc_chunks USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_sdc_embedding ON support_doc_chunks USING hnsw(embedding extensions.vector_cosine_ops);

-- Conversations
CREATE TABLE IF NOT EXISTS public.support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'escalated', 'closed')),
  escalated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sc_user ON support_conversations(user_id);

-- Messages
CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  sources jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sm_conv ON support_messages(conversation_id);

-- RLS
ALTER TABLE support_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_doc_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sd_select" ON support_docs FOR SELECT TO authenticated USING (true);
CREATE POLICY "sdc_select" ON support_doc_chunks FOR SELECT TO authenticated USING (true);
CREATE POLICY "sc_select" ON support_conversations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "sc_insert" ON support_conversations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "sc_update" ON support_conversations FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "sm_select" ON support_messages FOR SELECT TO authenticated
  USING (conversation_id IN (SELECT id FROM support_conversations WHERE user_id = auth.uid()));
CREATE POLICY "sm_insert" ON support_messages FOR INSERT TO authenticated
  WITH CHECK (conversation_id IN (SELECT id FROM support_conversations WHERE user_id = auth.uid()));

-- Full-text search RPC
CREATE OR REPLACE FUNCTION public.search_support_docs(
  p_query text,
  p_limit int DEFAULT 5
)
RETURNS TABLE (
  chunk_id uuid,
  doc_id uuid,
  doc_title text,
  doc_category text,
  content text,
  rank real
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS chunk_id,
    d.id AS doc_id,
    d.title AS doc_title,
    d.category AS doc_category,
    c.content,
    ts_rank(c.search_vector, websearch_to_tsquery('english', p_query)) AS rank
  FROM support_doc_chunks c
  JOIN support_docs d ON d.id = c.doc_id
  WHERE c.search_vector @@ websearch_to_tsquery('english', p_query)
  ORDER BY rank DESC
  LIMIT p_limit;
END;
$$;
