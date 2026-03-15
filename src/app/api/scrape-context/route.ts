import Anthropic from '@anthropic-ai/sdk';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { validateUrl } from '@/lib/url-validation';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const limiter = rateLimit({ tokens: 5, interval: 60_000 });

export async function POST(req: Request) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit
  const rl = await limiter.check(user.id);
  if (!rl.ok) {
    return Response.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  let body: { url: string };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { url } = body;
  if (!url) {
    return Response.json({ error: 'url is required' }, { status: 400 });
  }

  // Validate URL
  const validation = validateUrl(url);
  if (!validation.ok) {
    return Response.json({ error: validation.reason }, { status: 400 });
  }

  try {
    // Fetch the page HTML
    const response = await fetch(validation.url.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KBify/1.0)' },
    });

    if (!response.ok) {
      return Response.json(
        { error: `Failed to fetch URL (status ${response.status})` },
        { status: 400 }
      );
    }

    const html = await response.text();

    // Trim HTML to avoid sending too much to Claude
    const trimmedHtml = html.slice(0, 30000);

    // Use Claude to extract company info
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    const start = Date.now();
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: `You are an expert at extracting company information from websites.
Analyze the provided HTML and extract structured company information.
Return a JSON object with these fields:
- name: Company name
- description: What the company does (2-3 sentences)
- industry: The industry/sector
- targetAudience: Who the product/service is for

Return ONLY the JSON object, no markdown or explanations.`,
      messages: [
        {
          role: 'user',
          content: `Extract company information from this website HTML:\n\n${trimmedHtml}`,
        },
      ],
    });
    const durationMs = Date.now() - start;

    // Log usage (best-effort)
    try {
      const admin = createSupabaseAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await admin.from('api_usage_logs').insert({
        user_id: user.id,
        model: 'claude-sonnet-4-6',
        agent: 'scrape-context',
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
        duration_ms: durationMs,
      });
    } catch {
      // Don't fail the request if logging fails
    }

    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return Response.json({ error: 'Failed to extract info' }, { status: 500 });
    }

    // Parse the JSON response
    const jsonStr = textBlock.text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    return Response.json({
      name: parsed.name ?? '',
      description: parsed.description ?? '',
      industry: parsed.industry ?? '',
      targetAudience: parsed.targetAudience ?? '',
    });
  } catch {
    return Response.json({ error: 'Failed to scrape website. Please check the URL and try again.' }, { status: 500 });
  }
}
