import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const limiter = rateLimit({ tokens: 5, interval: 60_000 });

/** Only allow http/https and block private/internal IPs. */
function validateUrl(raw: string): { ok: true; url: URL } | { ok: false; reason: string } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: 'Invalid URL format' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: 'Only http and https URLs are allowed' };
  }

  const hostname = url.hostname.toLowerCase();

  // Block localhost variants
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '0.0.0.0'
  ) {
    return { ok: false, reason: 'Internal addresses are not allowed' };
  }

  // Block private/internal IP ranges
  const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    if (
      a === 10 ||                           // 10.0.0.0/8
      (a === 172 && b >= 16 && b <= 31) ||  // 172.16.0.0/12
      (a === 192 && b === 168) ||           // 192.168.0.0/16
      (a === 169 && b === 254) ||           // 169.254.0.0/16 (link-local)
      a === 127                              // 127.0.0.0/8
    ) {
      return { ok: false, reason: 'Internal addresses are not allowed' };
    }
  }

  return { ok: true, url };
}

export async function POST(req: Request) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit
  const rl = limiter.check(user.id);
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

    // Try to extract the main article content area
    // Look for common KB article content containers
    let articleHtml = html;

    // Try common content selectors via regex
    const contentPatterns = [
      // HelpJuice article body
      /<div[^>]*class="[^"]*article[_-]?body[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i,
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /<div[^>]*id="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*$/im,
      /<main[^>]*>([\s\S]*?)<\/main>/i,
    ];

    for (const pattern of contentPatterns) {
      const match = html.match(pattern);
      if (match && match[0].length > 200) {
        articleHtml = match[0];
        break;
      }
    }

    // Trim if too long
    if (articleHtml.length > 50000) {
      articleHtml = articleHtml.slice(0, 50000);
    }

    return Response.json({ html: articleHtml });
  } catch {
    return Response.json({ error: 'Failed to scrape website. Please check the URL and try again.' }, { status: 500 });
  }
}
