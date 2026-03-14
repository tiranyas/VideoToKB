import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js';
import { validateApiKey } from '@/lib/api-keys';
import { rateLimit } from '@/lib/rate-limit';
import { runPhaseA, runPhaseB } from '@/lib/pipeline';
import type { ProgressEvent } from '@/types';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const limiter = rateLimit({ tokens: 5, interval: 60_000 });

let _admin: SupabaseClient | null = null;
function getAdmin(): SupabaseClient {
  if (!_admin) {
    _admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _admin;
}

interface GenerateRequest {
  videoUrl?: string;
  transcript?: string;
  articleType?: string;   // article type ID (optional — uses user's default)
  platform?: string;      // platform profile ID (optional — uses user's default)
}

interface GenerateResponse {
  id: string;
  title: string;
  markdown: string;
  html?: string;
  platform: string;
  articleType: string;
}

/**
 * POST /api/v1/generate
 *
 * Public API endpoint for programmatic article generation.
 * Authenticates via API key in Authorization header.
 *
 * Request:
 *   Authorization: Bearer vtk_...
 *   Content-Type: application/json
 *   { "videoUrl": "..." } or { "transcript": "..." }
 *   Optional: { "articleType": "...", "platform": "..." }
 *
 * Response:
 *   { "id", "title", "markdown", "html", "platform", "articleType" }
 */
export async function POST(req: Request) {
  // ── Auth via API key ────────────────────────────────
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json(
      { error: 'Missing or invalid Authorization header. Use: Bearer vtk_...' },
      { status: 401 }
    );
  }

  const apiKey = authHeader.slice(7).trim();
  if (!apiKey.startsWith('vtk_')) {
    return Response.json(
      { error: 'Invalid API key format. Keys start with vtk_' },
      { status: 401 }
    );
  }

  const userId = await validateApiKey(apiKey);
  if (!userId) {
    return Response.json({ error: 'Invalid or revoked API key' }, { status: 401 });
  }

  // ── Rate limit ──────────────────────────────────────
  const rl = limiter.check(`api:${userId}`);
  if (!rl.ok) {
    return Response.json(
      { error: 'Rate limit exceeded. Max 5 requests per minute.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) },
      }
    );
  }

  // ── Parse body ──────────────────────────────────────
  let body: GenerateRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.videoUrl && !body.transcript) {
    return Response.json(
      { error: 'Either "videoUrl" or "transcript" is required' },
      { status: 400 }
    );
  }

  // ── Load user settings ──────────────────────────────
  // Get user preferences for defaults
  const { data: prefs } = await getAdmin()
    .from('user_preferences')
    .select('selected_article_type_id, selected_platform_id')
    .eq('user_id', userId)
    .maybeSingle();

  const articleTypeId = body.articleType || prefs?.selected_article_type_id;
  const platformId = body.platform || prefs?.selected_platform_id;

  if (!articleTypeId) {
    return Response.json(
      { error: 'No article type specified and no default set. Pass "articleType" or set a default in Settings.' },
      { status: 400 }
    );
  }

  // Load article type
  const { data: articleType } = await getAdmin()
    .from('article_types')
    .select('*')
    .eq('id', articleTypeId)
    .maybeSingle();

  if (!articleType) {
    return Response.json({ error: `Article type "${articleTypeId}" not found` }, { status: 400 });
  }

  // Load platform profile
  let platform: { id: string; name: string; html_prompt: string; html_template: string } | null = null;
  if (platformId) {
    const { data } = await getAdmin()
      .from('platform_profiles')
      .select('*')
      .eq('id', platformId)
      .maybeSingle();
    platform = data;
  }

  // Load company context
  let companyContext: string | undefined;
  const { data: ctx } = await getAdmin()
    .from('company_contexts')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (ctx) {
    companyContext = `Company: ${ctx.name}\n${ctx.description}\nIndustry: ${ctx.industry ?? 'N/A'}\nTarget audience: ${ctx.target_audience ?? 'N/A'}`;
  }

  // ── Run Phase A: Generate structured article ────────
  let structuredArticle = '';
  let phaseAError = '';

  await runPhaseA(
    {
      videoUrl: body.videoUrl,
      transcript: body.transcript,
      draftPrompt: articleType.draft_prompt,
      structurePrompt: articleType.structure_prompt,
      companyContext,
    },
    (event: ProgressEvent) => {
      if (event.step === 'error') {
        phaseAError = event.message ?? 'Article generation failed';
      } else if (event.step === 'review' && event.article) {
        structuredArticle = event.article;
      }
    }
  );

  if (phaseAError) {
    return Response.json({ error: phaseAError }, { status: 500 });
  }

  if (!structuredArticle) {
    return Response.json({ error: 'Article generation produced no output' }, { status: 500 });
  }

  // ── Run Phase B: Generate platform output (if applicable) ──
  let finalOutput = structuredArticle;
  const isMarkdownOnly = !platform || (platform.id === 'markdown-only' && !platform.html_template && !platform.html_prompt);
  const needsFormatting = platform && (platform.html_template || platform.html_prompt) && platform.id !== 'markdown-only';

  if (needsFormatting && platform) {
    let phaseBError = '';

    await runPhaseB(
      {
        article: structuredArticle,
        htmlPrompt: platform.html_prompt,
        htmlTemplate: platform.html_template ?? '',
      },
      (event: ProgressEvent) => {
        if (event.step === 'error') {
          phaseBError = event.message ?? 'HTML generation failed';
        } else if (event.step === 'done' && event.html) {
          finalOutput = event.html;
        }
      }
    );

    if (phaseBError) {
      // Return markdown even if HTML fails — partial success
      finalOutput = structuredArticle;
    }
  }

  // ── Save article to DB ──────────────────────────────
  const title = structuredArticle.match(/^#+\s+(.+)/m)?.[1]
    ?? structuredArticle.split('\n').map(l => l.trim()).find(l => l.length > 0)?.slice(0, 120)
    ?? 'Untitled Article';

  const sourceType = body.transcript
    ? 'paste'
    : (body.videoUrl?.includes('drive.google') ? 'google-drive' : 'loom');

  const { data: saved, error: saveError } = await getAdmin()
    .from('articles')
    .insert({
      user_id: userId,
      title,
      source_url: body.videoUrl ?? null,
      source_type: sourceType,
      article_type_id: articleTypeId,
      platform_id: platformId ?? null,
      markdown: structuredArticle,
      html: needsFormatting && finalOutput !== structuredArticle ? finalOutput : null,
    })
    .select('id')
    .single();

  if (saveError) {
    // Still return the article even if save fails
    return Response.json({
      title,
      markdown: structuredArticle,
      html: needsFormatting && finalOutput !== structuredArticle ? finalOutput : undefined,
      platform: platform?.name ?? 'Markdown Only',
      articleType: articleType.name,
      warning: 'Article generated but failed to save to database',
    });
  }

  // ── Return response ─────────────────────────────────
  const response: GenerateResponse = {
    id: saved.id,
    title,
    markdown: structuredArticle,
    platform: platform?.name ?? 'Markdown Only',
    articleType: articleType.name,
  };

  if (needsFormatting && finalOutput !== structuredArticle) {
    response.html = finalOutput;
  }

  return Response.json(response);
}
