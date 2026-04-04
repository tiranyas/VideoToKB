import type { SSEEvent } from '@/types';

/**
 * Parse an SSE stream from a fetch Response and call onEvent for each parsed event.
 * Handles both ProgressEvent and TokenEvent types.
 * Silently skips malformed JSON but propagates errors thrown by onEvent.
 */
export async function readSSEStream(
  response: Response,
  onEvent: (event: SSEEvent) => void
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response stream available');

  const decoder = new TextDecoder();
  let buffer = '';
  const CHUNK_TIMEOUT_MS = 60_000; // 60s max between chunks

  while (true) {
    // Race between next chunk and timeout — prevents hanging on network drop
    const timeout = new Promise<{ done: true; value: undefined }>((_, reject) =>
      setTimeout(() => reject(new Error('Stream timeout: no data received for 60s')), CHUNK_TIMEOUT_MS)
    );
    const { done, value } = await Promise.race([reader.read(), timeout]);
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      const lines = part.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event: SSEEvent = JSON.parse(line.slice(6));
            onEvent(event);
          } catch (e) {
            // If the error came from onEvent (not JSON.parse), re-throw it
            if (e instanceof SyntaxError) {
              // Skip malformed JSON silently
            } else {
              throw e;
            }
          }
        }
      }
    }
  }
}
