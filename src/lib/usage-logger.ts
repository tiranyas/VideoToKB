import { createClient } from '@supabase/supabase-js';
import { collectUsageLogs } from './article-generator';

let _admin: ReturnType<typeof createClient> | null = null;

function getAdmin() {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _admin;
}

/**
 * Flush collected API usage logs to the database.
 * Call this after pipeline execution completes.
 * Non-blocking — errors are logged but don't propagate.
 */
export async function flushUsageLogs(
  userId: string,
  articleId?: string
): Promise<void> {
  const logs = collectUsageLogs();
  if (logs.length === 0) return;

  const rows = logs.map((log) => ({
    user_id: userId,
    article_id: articleId ?? null,
    model: log.model,
    agent: log.agent,
    input_tokens: log.inputTokens,
    output_tokens: log.outputTokens,
    duration_ms: log.durationMs,
  }));

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await getAdmin()
      .from('api_usage_logs')
      .insert(rows as any);

    if (error) {
      console.error('Failed to flush usage logs:', error.message);
    }
  } catch (err) {
    console.error('Usage log flush error:', err);
  }
}
