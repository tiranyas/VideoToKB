import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-6';

export interface ApiUsageLog {
  model: string;
  agent: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

// Collected during pipeline execution, flushed to DB afterward
let _pendingLogs: (ApiUsageLog & { userId?: string; articleId?: string })[] = [];

export function collectUsageLogs(): typeof _pendingLogs {
  const logs = [..._pendingLogs];
  _pendingLogs = [];
  return logs;
}

let _client: Anthropic | null = null;
function getClient() {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return _client;
}

async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 4000,
  agentName = 'unknown',
  onToken?: (chunk: string) => void
): Promise<string> {
  const anthropic = getClient();

  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const start = Date.now();

      // Use streaming when onToken callback is provided
      if (onToken) {
        const stream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        });

        let accumulated = '';

        stream.on('text', (text) => {
          accumulated += text;
          onToken(text);
        });

        const finalMessage = await stream.finalMessage();
        const durationMs = Date.now() - start;

        _pendingLogs.push({
          model: MODEL,
          agent: agentName,
          inputTokens: finalMessage.usage.input_tokens,
          outputTokens: finalMessage.usage.output_tokens,
          durationMs,
        });

        return accumulated;
      }

      // Non-streaming path (for v1 API and fallback)
      const message = await anthropic.messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });
      const durationMs = Date.now() - start;

      const textBlock = message.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('Claude returned no text content');
      }

      // Track usage
      _pendingLogs.push({
        model: MODEL,
        agent: agentName,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        durationMs,
      });

      return textBlock.text;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const status = (err as any)?.status ?? 0;
      const msg = lastError.message;
      const isRetryable =
        status === 429 || status === 500 || status === 503 || status === 529 ||
        msg.includes('overloaded') || msg.includes('Internal server error');

      if (!isRetryable || attempt === MAX_RETRIES) {
        throw lastError;
      }

      // Wait before retrying: 2s, 4s, 6s (longer for rate limits)
      const delay = status === 429 ? attempt * 5000 : attempt * 2000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError ?? new Error('Failed after retries');
}

/**
 * Legacy single-step generation (kept for backward compatibility)
 */
export async function generateArticle(
  cleanedTranscript: string,
  templatePrompt: string
): Promise<string> {
  return callClaude(
    templatePrompt,
    `Generate a KB article from the following video transcript:\n\n${cleanedTranscript}`,
    4000,
    'legacy-single'
  );
}

/**
 * Estimate token count from text (rough: 1 token ≈ 4 chars).
 * Used to scale output limits for long transcripts.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Scale max_tokens based on input length.
 * Short content → default limit. Long content → proportionally more output.
 * Ratio varies per agent:
 *   - Draft (0.8x): summarises transcript, output shorter than input
 *   - Structure (1.2x): reformats draft, output ≈ same size or slightly larger
 *   - HTML (1.5x): wraps in tags, output larger than input
 */
function scaledMaxTokens(inputText: string, base: number, cap: number, ratio = 0.8): number {
  const inputTokens = estimateTokens(inputText);
  if (inputTokens > 2000) {
    const scaled = Math.min(Math.round(inputTokens * ratio), cap);
    return Math.max(scaled, base);
  }
  return base;
}

/**
 * Agent 2 — Draft Generator
 * Takes a transcript and produces a comprehensive draft article.
 * Output tokens scale with transcript length (4,000 → up to 24,000).
 */
export async function generateDraft(
  transcript: string,
  draftSystemPrompt: string,
  onToken?: (chunk: string) => void
): Promise<string> {
  const maxTokens = scaledMaxTokens(transcript, 4000, 24000, 0.8);
  console.log(`[agent2-draft] input=${estimateTokens(transcript)} tokens, maxOutput=${maxTokens}`);
  const result = await callClaude(
    draftSystemPrompt,
    `Create a comprehensive draft article from the following transcript:\n\n${transcript}`,
    maxTokens,
    'draft',
    onToken
  );
  console.log(`[agent2-draft] output=${estimateTokens(result)} tokens (${result.length} chars)`);
  return result;
}

/**
 * Agent 3 — Structure Formatter
 * Takes a draft and structures it according to the article type template.
 * Output tokens scale with draft length (4,000 → up to 24,000).
 */
export async function generateStructured(
  draft: string,
  structureSystemPrompt: string,
  onToken?: (chunk: string) => void
): Promise<string> {
  const maxTokens = scaledMaxTokens(draft, 4000, 24000, 1.2);
  console.log(`[agent3-structure] input=${estimateTokens(draft)} tokens, maxOutput=${maxTokens}`);
  const result = await callClaude(
    structureSystemPrompt,
    `Transform the following draft article into a professionally structured article according to the template:\n\n${draft}`,
    maxTokens,
    'structure',
    onToken
  );
  console.log(`[agent3-structure] output=${estimateTokens(result)} tokens (${result.length} chars)`);
  return result;
}

/**
 * Agent 4 — HTML Generator
 * Takes a structured article and converts it to platform-specific HTML.
 * Output tokens scale with article length (5,000 → up to 24,000).
 */
export async function generateHTML(
  structuredArticle: string,
  htmlSystemPrompt: string,
  onToken?: (chunk: string) => void
): Promise<string> {
  const maxTokens = scaledMaxTokens(structuredArticle, 5000, 24000, 1.5);
  console.log(`[agent4-html] input=${estimateTokens(structuredArticle)} tokens, maxOutput=${maxTokens}`);
  return callClaude(
    htmlSystemPrompt,
    `Convert the following structured article into HTML code that matches the reference template exactly:\n\n${structuredArticle}`,
    maxTokens,
    'html',
    onToken
  );
}
