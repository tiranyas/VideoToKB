import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { validateUrl } from '@/lib/url-validation';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const limiter = rateLimit({ tokens: 5, interval: 60_000 });

/**
 * Fetch a screenshot of the website via thum.io (free, no API key).
 * Returns base64-encoded PNG or null on failure.
 */
async function fetchScreenshot(url: string): Promise<string | null> {
  try {
    const screenshotUrl = `https://image.thum.io/get/width/1280/crop/900/png/noanimate/${encodeURIComponent(url)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    const res = await fetch(screenshotUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const buffer = await res.arrayBuffer();
    // thum.io may return a tiny loading spinner initially — reject if too small
    if (buffer.byteLength < 5000) return null;

    return Buffer.from(buffer).toString('base64');
  } catch {
    return null;
  }
}

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

  // Auto-prepend https:// if missing
  const normalizedUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;

  // Validate URL
  const validation = validateUrl(normalizedUrl);
  if (!validation.ok) {
    return Response.json({ error: validation.reason }, { status: 400 });
  }

  try {
    const targetUrl = validation.url.toString();

    // Fetch HTML and screenshot in parallel
    const [htmlResult, screenshot] = await Promise.all([
      fetchHtml(targetUrl),
      fetchScreenshot(targetUrl),
    ]);

    if (!htmlResult.ok) {
      return Response.json({ error: htmlResult.error }, { status: 400 });
    }

    const { html, css } = htmlResult;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    // Build message content — use screenshot (Vision) for colors if available
    const messageContent: Anthropic.MessageCreateParams['messages'][0]['content'] = [];

    if (screenshot) {
      // Primary approach: screenshot + Vision for accurate color extraction
      messageContent.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/png', data: screenshot },
      });
      messageContent.push({
        type: 'text',
        text: `Look at this screenshot of the website AND analyze the HTML below to extract company information and brand colors.

For BRAND COLORS: Use the SCREENSHOT — identify the 2-3 most prominent brand colors you can SEE on the page (buttons, headers, banners, accents). These are the actual visual colors, not CSS variable names.

For COMPANY INFO: Use the HTML text content below.

HTML content:
${html.slice(0, 15000)}`,
      });
    } else {
      // Fallback: HTML-only analysis (less accurate for colors)
      messageContent.push({
        type: 'text',
        text: `Extract company information and branding from this website HTML:\n\n${html.slice(0, 25000)}${css ? `\n\n<!-- Extracted CSS -->\n<style>\n${css}\n</style>` : ''}`,
      });
    }

    const start = Date.now();
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `You are an expert at extracting company information and brand identity from websites.
Extract structured company information and branding.

Return a JSON object with these fields:
- name: Company name
- description: What the company does (2-3 sentences)
- industry: The industry/sector
- targetAudience: Who the product/service is for
- branding: An object with:
  - primaryColor: The MAIN brand color as hex (e.g., "#f75c33"). This is the most prominent non-white, non-black, non-gray color used for buttons, links, or accents.
  - secondaryColor: A second prominent brand color as hex. Look for banner backgrounds, secondary buttons, or highlights.
  - accentColor: A third accent color if present.
  - fontFamily: The primary font family (e.g., "Inter", "Roboto").
  - logoUrl: The URL of the company logo if visible in HTML.

CRITICAL: You MUST return at least primaryColor and secondaryColor. Every brand has colors — identify them from the visual appearance.
Return ONLY the JSON object, no markdown fences or explanations.`,
      messages: [{ role: 'user', content: messageContent }],
    });
    const durationMs = Date.now() - start;

    // Log usage (best-effort)
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

/**
 * Fetch page HTML with browser-like headers.
 * Also extracts inline CSS and meta theme-color for fallback color analysis.
 */
async function fetchHtml(url: string): Promise<{ ok: true; html: string; css: string } | { ok: false; error: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
  } catch (fetchErr) {
    clearTimeout(timeout);
    const msg = fetchErr instanceof Error && fetchErr.name === 'AbortError'
      ? 'Website took too long to respond'
      : 'Could not reach the website';
    return { ok: false, error: msg };
  }
  clearTimeout(timeout);

  if (!response.ok) {
    return { ok: false, error: `Failed to fetch URL (status ${response.status})` };
  }

  const html = await response.text();

  // Extract inline <style> blocks for fallback color analysis
  let css = '';
  try {
    const styleMatches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
    if (styleMatches) {
      css = styleMatches
        .map(block => block.replace(/<\/?style[^>]*>/gi, ''))
        .join('\n')
        .slice(0, 8000);
    }
    const themeColorMatch = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["']/i);
    if (themeColorMatch) {
      css += `\n/* meta theme-color: ${themeColorMatch[1]} */`;
    }
  } catch {
    // CSS extraction failed, continue without it
  }

  return { ok: true, html, css };
}
