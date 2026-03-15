import { describe, it, expect, vi } from 'vitest';
import { readSSEStream } from '@/lib/sse';

/** Build a mock Response whose body streams the given string chunks. */
function mockResponse(chunks: string[]): Response {
  let i = 0;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(encoder.encode(chunks[i]));
        i++;
      } else {
        controller.close();
      }
    },
  });
  return { body: stream } as unknown as Response;
}

describe('readSSEStream', () => {
  it('parses a single SSE event and calls onEvent', async () => {
    const response = mockResponse([
      'data: {"step":"resolve","status":"complete"}\n\n',
    ]);
    const onEvent = vi.fn();

    await readSSEStream(response, onEvent);

    expect(onEvent).toHaveBeenCalledOnce();
    expect(onEvent).toHaveBeenCalledWith({ step: 'resolve', status: 'complete' });
  });

  it('handles multiple events separated by double newlines', async () => {
    const response = mockResponse([
      'data: {"step":"resolve","status":"complete"}\n\ndata: {"step":"transcribe","status":"in_progress"}\n\n',
    ]);
    const onEvent = vi.fn();

    await readSSEStream(response, onEvent);

    expect(onEvent).toHaveBeenCalledTimes(2);
    expect(onEvent).toHaveBeenNthCalledWith(1, { step: 'resolve', status: 'complete' });
    expect(onEvent).toHaveBeenNthCalledWith(2, { step: 'transcribe', status: 'in_progress' });
  });

  it('handles chunked data where an event spans two read() calls', async () => {
    const response = mockResponse([
      'data: {"ste',
      'p":"resolve","status":"complete"}\n\n',
    ]);
    const onEvent = vi.fn();

    await readSSEStream(response, onEvent);

    expect(onEvent).toHaveBeenCalledOnce();
    expect(onEvent).toHaveBeenCalledWith({ step: 'resolve', status: 'complete' });
  });

  it('silently skips malformed JSON lines', async () => {
    const response = mockResponse([
      'data: not-json\n\ndata: {"step":"resolve","status":"complete"}\n\n',
    ]);
    const onEvent = vi.fn();

    await readSSEStream(response, onEvent);

    expect(onEvent).toHaveBeenCalledOnce();
    expect(onEvent).toHaveBeenCalledWith({ step: 'resolve', status: 'complete' });
  });

  it('propagates errors thrown by onEvent callback', async () => {
    const response = mockResponse([
      'data: {"step":"error","status":"error","message":"fail"}\n\n',
    ]);
    const onEvent = vi.fn().mockImplementation(() => {
      throw new Error('callback error');
    });

    await expect(readSSEStream(response, onEvent)).rejects.toThrow('callback error');
  });

  it('resolves when stream is done', async () => {
    const response = mockResponse([
      'data: {"step":"done","status":"complete"}\n\n',
    ]);
    const onEvent = vi.fn();

    await expect(readSSEStream(response, onEvent)).resolves.toBeUndefined();
  });
});
