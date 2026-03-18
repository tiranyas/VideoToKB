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
        text: `Look at this screenshot of the website AND analyze the HTML below.

BRAND COLORS (from SCREENSHOT only):
1. primaryColor: The single most dominant NON-WHITE, NON-BLACK, NON-GRAY brand color. Look at CTA buttons, navigation highlights, banners, and accent elements. This is the color that defines the brand.
2. secondaryColor: The second most prominent brand color. Often used in banners, secondary buttons, or highlights.
3. accentColor: A third accent color if clearly present.

IMPORTANT: Only return colors you can CLEARLY SEE in the screenshot. Do NOT guess. Do NOT return generic grays, whites, or blacks as brand colors. Do NOT return WordPress default colors. If a bright colored banner or button is visible, that IS a brand color.

COMPANY INFO (from HTML):
Extract name, description, industry, and target audience from the text content.

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
      system: `You extract company info and brand identity from websites. When a screenshot is provided, use it for color extraction — it shows the ACTUAL rendered colors.

Return ONLY a JSON object (no markdown fences):
{
  "name": "Company Name",
  "description": "What the company does (2-3 sentences)",
  "industry": "Industry/sector",
  "targetAudience": "Who the product is for",
  "branding": {
    "primaryColor": "#hexcode (the dominant brand color from buttons/CTAs/accents — NEVER white/black/gray)",
    "secondaryColor": "#hexcode (second brand color from banners/highlights)",
    "accentColor": "#hexcode (third color if present, omit if not)",
    "fontFamily": "Font name",
    "logoUrl": "URL if found in HTML"
  }
}

Rules for colors:
- ONLY return colors clearly visible in the screenshot as brand elements
- NEVER return #ffffff, #000000, #333333, or any gray as a brand color
- NEVER return WordPress/framework default palette colors
- primaryColor = the color of CTA buttons or the most eye-catching accent
- secondaryColor = a clearly different second brand color (banners, highlights)
- If you can only find one clear brand color, set secondaryColor to a darker/lighter shade of it`,
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
