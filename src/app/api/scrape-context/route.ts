import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

export const maxDuration = 60;
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
