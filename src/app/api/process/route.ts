import { runPhaseA, runPhaseB } from '@/lib/pipeline';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { checkQuota } from '@/lib/supabase/queries';
import type { ProgressEvent } from '@/types';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const limiter = rateLimit({ tokens: 10, interval: 60_000 });

interface RequestBody {
  // Phase indicator
  phase: 'generate' | 'html';

  // Phase A inputs
  videoUrl?: string;
  transcript?: string;
  draftPrompt?: string;
  structurePrompt?: string;
  companyContext?: string;

  // Phase B inputs
  article?: string;
  htmlPrompt?: string;
  htmlTemplate?: string;
}

export async function POST(req: Request) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Rate limit
  const rl = await limiter.check(user.id);
  if (!rl.ok) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)),
        },
      }
    );
  }

  let body: RequestBody;

  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { phase = 'generate' } = body;

  // Quota check — only for new article generation (not HTML conversion)
  if (phase === 'generate') {
    try {
      const quota = await checkQuota(supabase, user.id);
      if (!quota.allowed) {
        return new Response(
          JSON.stringify({
            error: 'quota_exceeded',
            message: quota.message,
            usage: quota.usage,
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } catch {
      // Don't block on quota check errors — let the request through
      console.error('Quota check failed, allowing request');
    }
  }

  // Validate inputs based on phase
  if (phase === 'generate') {
    if (!body.videoUrl && !body.transcript) {
      return new Response(
        JSON.stringify({ error: 'Either videoUrl or transcript is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (!body.draftPrompt || !body.structurePrompt) {
      return new Response(
        JSON.stringify({ error: 'draftPrompt and structurePrompt are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } else if (phase === 'html') {
    if (!body.article) {
      return new Response(
        JSON.stringify({ error: 'article is required for HTML generation' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (!body.htmlPrompt) {
      return new Response(
        JSON.stringify({ error: 'htmlPrompt is required for HTML generation' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      (async () => {
        const send = (event: ProgressEvent) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        };

        try {
          if (phase === 'generate') {
            await runPhaseA(
              {
                videoUrl: body.videoUrl,
                transcript: body.transcript,
                draftPrompt: body.draftPrompt!,
                structurePrompt: body.structurePrompt!,
                companyContext: body.companyContext,
              },
              send
            );
          } else {
            await runPhaseB(
              {
                article: body.article!,
                htmlPrompt: body.htmlPrompt!,
                htmlTemplate: body.htmlTemplate ?? '',
              },
              send
            );
          }
        } catch {
          send({
            step: 'error',
            status: 'error',
            message: 'An unexpected error occurred during processing.',
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
