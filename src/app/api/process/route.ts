import { runPhaseA, runPhaseB } from '@/lib/pipeline';
import { flushUsageLogs } from '@/lib/usage-logger';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { checkQuota } from '@/lib/supabase/queries';
import { assertEnvVars } from '@/lib/env';
import type { SSEEvent } from '@/types';

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
  outputLanguage?: string;

  // Phase B inputs
  article?: string;
  htmlPrompt?: string;
  htmlTemplate?: string;
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    logoUrl?: string;
    fontFamily?: string;
    customCss?: string;
  };
  applyBranding?: boolean;
}

export async function POST(req: Request) {
  // Fail fast if server is missing critical env vars
  try { assertEnvVars(); } catch {
    return new Response(
      JSON.stringify({ error: 'Service temporarily unavailable' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

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
    } catch (err) {
      // Fail closed — block request to prevent unbilled usage during DB outage
      console.error('Quota check failed, blocking request:', err);
      return new Response(
        JSON.stringify({ error: 'Unable to verify quota. Please try again shortly.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // Input size validation (prevent DoS / token overflow)
  const MAX_TRANSCRIPT = 500_000;  // ~125k tokens
  const MAX_PROMPT = 50_000;
  const MAX_ARTICLE = 200_000;

  if (body.transcript && body.transcript.length > MAX_TRANSCRIPT) {
    return new Response(
      JSON.stringify({ error: 'Transcript is too long. Please shorten it and try again.' }),
      { status: 413, headers: { 'Content-Type': 'application/json' } }
    );
  }
  if (body.article && body.article.length > MAX_ARTICLE) {
    return new Response(
      JSON.stringify({ error: 'Article is too long for HTML generation.' }),
      { status: 413, headers: { 'Content-Type': 'application/json' } }
    );
  }
  if ((body.draftPrompt && body.draftPrompt.length > MAX_PROMPT) ||
      (body.structurePrompt && body.structurePrompt.length > MAX_PROMPT) ||
      (body.htmlPrompt && body.htmlPrompt.length > MAX_PROMPT)) {
    return new Response(
      JSON.stringify({ error: 'Prompt is too long.' }),
      { status: 413, headers: { 'Content-Type': 'application/json' } }
    );
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

  const userId = user.id;

  const stream = new ReadableStream({
    start(controller) {
      (async () => {
        const send = (event: SSEEvent) => {
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            );
          } catch {
            // Stream already closed — ignore
          }
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
                outputLanguage: body.outputLanguage,
              },
              send
            );
          } else {
            await runPhaseB(
              {
                article: body.article!,
                htmlPrompt: body.htmlPrompt!,
                htmlTemplate: body.htmlTemplate ?? '',
                branding: body.branding,
                applyBranding: body.applyBranding,
              },
              send
            );
          }
        } catch (err) {
          console.error('Pipeline error:', err);
          send({
            step: 'error',
            status: 'error',
            message: 'An unexpected error occurred during processing.',
          });
        } finally {
          // Flush usage logs (best-effort, non-blocking)
          await flushUsageLogs(userId).catch((err) => {
            console.error('Failed to flush usage logs:', err);
          });
          controller.close();
        }
      })().catch((err) => {
        // Safety net: catch any unhandled errors in the stream IIFE
        console.error('Fatal stream error:', err);
        try { controller.close(); } catch { /* already closed */ }
      });
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
