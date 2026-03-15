import type { ProgressEvent } from '@/types';

/**
 * Parse an SSE stream from a fetch Response and call onEvent for each parsed event.
 * Silently skips malformed JSON but propagates errors thrown by onEvent.
 */
export async function readSSEStream(
  response: Response,
  onEvent: (event: ProgressEvent) => void
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response stream available');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      const lines = part.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event: ProgressEvent = JSON.parse(line.slice(6));
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
