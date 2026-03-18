import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { validateUrl } from '@/lib/url-validation';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const limiter = rateLimit({ tokens: 5, interval: 60_000 });

export async function POST(req: Request) {
  // Debug: log env var availability
  console.log('[scrape-context] ENV check:', {
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasService: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasAnthropic: !!process.env.ANTHROPIC_API_KEY,
  });

  // Auth check — step-by-step tracing to find crash point
  console.log('[scrape-context] STEP 1: before createClient');
  let supabase;
  try {
    supabase = await createClient();
    console.log('[scrape-context] STEP 2: createClient OK');
  } catch (e) {
    console.error('[scrape-context] STEP 2-ERR: createClient failed:', e);
    return Response.json({ error: 'Server configuration error' }, { status: 500 });
  }

  console.log('[scrape-context] STEP 3: before getUser');
  const { data: { user } } = await supabase.auth.getUser();
  console.log('[scrape-context] STEP 4: getUser done, hasUser:', !!user);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit
  console.log('[scrape-context] STEP 5: before rate limit');
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
    // Fetch the page HTML with browser-like headers and timeout
    const controller = new AbortController();
    const fetchTimeout = setTimeout(() => controller.abort(), 15_000);

    let response: Response;
    try {
      response = await fetch(validation.url.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(fetchTimeout);
      const msg = fetchErr instanceof Error && fetchErr.name === 'AbortError'
        ? 'Website took too long to respond'
        : 'Could not reach the website';
      return Response.json({ error: msg }, { status: 400 });
    }
    clearTimeout(fetchTimeout);

    if (!response.ok) {
      return Response.json(
        { error: `Failed to fetch URL (status ${response.status})` },
        { status: 400 }
      );
    }

    const html = await response.text();

    // Extract inline <style> blocks for color analysis
    let cssContext = '';
    try {
      const styleMatches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
      if (styleMatches) {
        cssContext = styleMatches
          .map(block => block.replace(/<\/?style[^>]*>/gi, ''))
          .join('\n')
          .slice(0, 8000);
      }
    } catch {
      // CSS extraction failed, continue without it
    }

    // Also extract meta theme-color
    const themeColorMatch = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["']/i);
    const themeColor = themeColorMatch ? `\n/* meta theme-color: ${themeColorMatch[1]} */` : '';

    // Trim HTML + append CSS for Claude
    const trimmedHtml = html.slice(0, 25000) + (cssContext || themeColor ? `\n\n<!-- Extracted CSS -->\n<style>\n${cssContext}${themeColor}\n</style>` : '');

    // Use Claude to extract company info
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    const start = Date.now();
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `You are an expert at extracting company information and brand identity from websites.
Analyze the provided HTML (including any CSS) and extract structured company information and branding.

Return a JSON object with these fields:
- name: Company name
- description: What the company does (2-3 sentences)
- industry: The industry/sector
- targetAudience: Who the product/service is for
- branding: An object with:
  - primaryColor: The MAIN brand color as hex (e.g., "#6d28d9"). You MUST find this. Look at ALL of these sources in order:
    1. CSS custom properties / variables (--primary, --brand-color, --theme-color, etc.)
    2. meta theme-color tag
    3. Header/navbar background color
    4. Button background colors (especially CTA buttons)
    5. Link colors (a tags)
    6. Inline style attributes on prominent elements
    7. SVG fill colors in the logo area
    8. Any color that appears 3+ times in the CSS
  - secondaryColor: Secondary brand color as hex. Look for secondary buttons, borders, hover states.
  - accentColor: Accent/highlight color as hex. Look for call-to-action elements, badges, highlights.
  - fontFamily: The primary font family (e.g., "Inter", "Roboto"). Check CSS font-family declarations, Google Fonts links.
  - logoUrl: The URL of the company logo (look for <img> in header/nav with "logo" in class/alt/src).

IMPORTANT: You MUST return at least primaryColor. Search thoroughly through CSS variables, inline styles, class definitions, and SVG elements. Every website has a primary brand color — find it.
Return ONLY the JSON object, no markdown fences or explanations.`,
      messages: [
        {
          role: 'user',
          content: `Extract company information and branding from this website HTML:\n\n${trimmedHtml}`,
        },
      ],
    });
    const durationMs = Date.now() - start;

    // Log usage (best-effort, skip if service role key not configured)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const { createClient: createAdmin } = await import('@supabase/supabase-js');
        const admin = createAdmin(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        await admin.from('api_usage_logs').insert({
          user_id: user.id,
          model: 'claude-sonnet-4-20250514',
          agent: 'scrape-context',
          input_tokens: message.usage.input_tokens,
          output_tokens: message.usage.output_tokens,
          duration_ms: durationMs,
        });
      } catch {
        // Don't fail the request if logging fails
      }
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
      branding: parsed.branding ?? {},
    });
  } catch (err) {
    console.error('[scrape-context] Error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json(
      { error: `Failed to scrape website: ${message}` },
      { status: 500 }
    );
  }
}
