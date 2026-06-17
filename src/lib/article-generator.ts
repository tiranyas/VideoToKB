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

// When the model stops because it hit max_tokens, we resume generation with the
// partial output as conversation history (NOT an assistant prefill — the turn
// ends on a user message, which is required: Sonnet 4.6 rejects trailing
// assistant prefills with a 400). This guarantees the full article is produced
// even when the token estimate is too low, so output is never silently truncated.
const CONTINUATION_PROMPT =
  'Continue exactly from where you stopped, mid-element if necessary. ' +
  'Output only the remaining content — do not repeat anything already produced, ' +
  'do not add any preamble or explanation, and do not wrap it in code fences.';
const MAX_CONTINUATIONS = 6;

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
        let accumulated = '';
        let inputTokens = 0;
        let outputTokens = 0;
        let messages: Anthropic.MessageParam[] = [{ role: 'user', content: userMessage }];

        for (let cont = 0; cont <= MAX_CONTINUATIONS; cont++) {
          const stream = anthropic.messages.stream({
            model: MODEL,
            max_tokens: maxTokens,
            system: systemPrompt,
            messages,
          });

          stream.on('text', (text) => {
            accumulated += text;
            onToken(text);
          });

          const finalMessage = await stream.finalMessage();
          inputTokens += finalMessage.usage.input_tokens;
          outputTokens += finalMessage.usage.output_tokens;

          if (finalMessage.stop_reason !== 'max_tokens') break;

          if (cont === MAX_CONTINUATIONS) {
            console.warn(`[${agentName}] output still truncated after ${MAX_CONTINUATIONS} continuations`);
            break;
          }

          console.log(`[${agentName}] hit max_tokens — auto-continuing (pass ${cont + 1})`);
          messages = [
            { role: 'user', content: userMessage },
            { role: 'assistant', content: accumulated },
            { role: 'user', content: CONTINUATION_PROMPT },
          ];
        }

        _pendingLogs.push({
          model: MODEL,
          agent: agentName,
          inputTokens,
          outputTokens,
          durationMs: Date.now() - start,
        });

        return accumulated;
      }

      // Non-streaming path (for v1 API)
      let accumulated = '';
      let inputTokens = 0;
      let outputTokens = 0;
      let messages: Anthropic.MessageParam[] = [{ role: 'user', content: userMessage }];

      for (let cont = 0; cont <= MAX_CONTINUATIONS; cont++) {
        const message = await anthropic.messages.create({
          model: MODEL,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages,
        });

        const textBlock = message.content.find((b) => b.type === 'text');
        if (!textBlock || textBlock.type !== 'text') {
          throw new Error('Claude returned no text content');
        }

        inputTokens += message.usage.input_tokens;
        outputTokens += message.usage.output_tokens;
        accumulated += textBlock.text;

        if (message.stop_reason !== 'max_tokens') break;

        if (cont === MAX_CONTINUATIONS) {
          console.warn(`[${agentName}] output still truncated after ${MAX_CONTINUATIONS} continuations`);
          break;
        }

        messages = [
          { role: 'user', content: userMessage },
          { role: 'assistant', content: accumulated },
          { role: 'user', content: CONTINUATION_PROMPT },
        ];
      }

      // Track usage
      _pendingLogs.push({
        model: MODEL,
        agent: agentName,
        inputTokens,
        outputTokens,
        durationMs: Date.now() - start,
      });

      return accumulated;
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
 * Scale max_tokens based on input length, capped at the model's output ceiling
 * (Sonnet 4.6 supports up to 64K output tokens via streaming).
 * Short content → default limit. Long content → proportionally more output.
 * Ratio varies per agent:
 *   - Draft (1.0x): summarises transcript, output ≈ input size
 *   - Structure (1.5x): reformats draft, output ≈ same size or larger
 *   - HTML (5.0x): wraps in styled tags, output much larger than input
 * If the estimate is still too low, callClaude auto-continues on max_tokens so
 * output is never silently truncated.
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
 * Output tokens scale with transcript length (6,000 → up to 64,000).
 */
export async function generateDraft(
  transcript: string,
  draftSystemPrompt: string,
  onToken?: (chunk: string) => void
): Promise<string> {
  const maxTokens = scaledMaxTokens(transcript, 6000, 64000, 1.0);
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
 * Output tokens scale with draft length (6,000 → up to 64,000).
 */
export async function generateStructured(
  draft: string,
  structureSystemPrompt: string,
  onToken?: (chunk: string) => void
): Promise<string> {
  const maxTokens = scaledMaxTokens(draft, 6000, 64000, 1.5);
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
 * Output tokens scale with article length (8,000 → up to 64,000).
 */
export async function generateHTML(
  structuredArticle: string,
  htmlSystemPrompt: string,
  onToken?: (chunk: string) => void
): Promise<string> {
  // HTML wrapping (styled divs, repeated class names, inline styles) expands the
  // source text several-fold, so this agent needs a much larger multiplier and
  // headroom than the text agents. Under-budgeting here is what truncated the
  // final ~20% of articles.
  const maxTokens = scaledMaxTokens(structuredArticle, 8000, 64000, 5.0);
  console.log(`[agent4-html] input=${estimateTokens(structuredArticle)} tokens, maxOutput=${maxTokens}`);
  return callClaude(
    htmlSystemPrompt,
    `Convert the following structured article into HTML code that matches the reference template exactly:\n\n${structuredArticle}`,
    maxTokens,
    'html',
    onToken
  );
}
