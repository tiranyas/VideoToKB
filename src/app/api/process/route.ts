import { runPipeline } from '@/lib/pipeline';
import type { ProgressEvent } from '@/types';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { videoUrl?: string; template?: string };

  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { videoUrl, template } = body;

  if (!videoUrl) {
    return new Response(
      JSON.stringify({ error: 'videoUrl is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Non-awaited async IIFE -- returns immediately so Response is sent
      (async () => {
        const send = (event: ProgressEvent) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        };

        try {
          await runPipeline(videoUrl, template ?? 'how-to', send);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          send({
            step: 'error',
            status: 'error',
            message: `Pipeline error: ${message}`,
          });
        } finally {
          controller.close();
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    },
  });
}
