import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { validateUrl } from '@/lib/url-validation';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const limiter = rateLimit({ tokens: 5, interval: 60_000 });

const ANALYSIS_PROMPT = `You are an expert at analyzing knowledge base article HTML to extract reusable platform-specific templates.

Given the HTML of a KB article, you must:

1. **Identify the platform** (HelpJuice, Zendesk, Intercom, Confluence, Notion, Freshdesk, GitBook, custom, etc.)
2. **Extract all CSS classes and patterns** used for article components
3. **Map components to the platform's CSS/HTML patterns**:
   - Summary/Opening block
   - Key Highlights / Prerequisites
   - Step-by-Step instructions
   - Explanatory sections (headings + paragraphs)
   - Callouts/Warnings/Tips/Notes
   - Related Links
   - FAQ / Accordion / Toggle sections
   - Tables
   - Code Blocks
   - Media (images, videos)
   - Any custom components unique to this platform

4. **Generate two outputs**:

   a) **htmlPrompt** — A detailed prompt for an AI to generate articles in this exact platform format. Include:
      - Platform name and description
      - Every CSS class identified and when to use it
      - Component mapping (which HTML elements + classes for each component type)
      - Styling rules (inline styles patterns, color variables, font patterns)
      - Any platform-specific patterns (data attributes, accordion markup, etc.)

   b) **htmlTemplate** — A clean reference HTML template showing the structure with placeholder content like [Title], [Summary], [Step 1], etc. Include all CSS classes, inline styles, and data attributes exactly as found in the source.

5. **Detect the platform name** for display

Return ONLY valid JSON in this exact format:
{
  "platformName": "Platform Name",
  "htmlPrompt": "the full prompt text...",
  "htmlTemplate": "the full HTML template..."
}

Do NOT include markdown fences around the JSON. Output ONLY the JSON object.`;

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

  let body: { url: string; analyze?: boolean };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { url, analyze = true } = body;
  if (!url) {
    return Response.json({ error: 'url is required' }, { status: 400 });
  }

  // Validate URL
  const validation = validateUrl(url);
  if (!validation.ok) {
    return Response.json({ error: validation.reason }, { status: 400 });
  }

  try {
    // Step 1: Fetch the page HTML with full browser-like headers
    // Many KB platforms (Helpjuice, Zendesk) block requests from cloud IPs
    // so we need comprehensive headers to pass bot detection
    const targetUrl = validation.url.toString();
    const browserHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,he;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Referer': new URL(targetUrl).origin + '/',
    };

    let response = await fetch(targetUrl, {
      headers: browserHeaders,
      redirect: 'follow',
    });

    // If blocked, retry with a different User-Agent (Googlebot — most sites allow this)
    if (response.status === 403) {
      response = await fetch(targetUrl, {
        headers: {
          ...browserHeaders,
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        },
        redirect: 'follow',
      });
    }

    if (!response.ok) {
      return Response.json(
        { error: `Failed to fetch URL (status ${response.status}). The site may block automated access. Try a different article URL.` },
        { status: 400 }
      );
    }

    const fullHtml = await response.text();

    // Step 2: Extract article body via platform-specific and common patterns
    let articleHtml = fullHtml;
    const contentPatterns = [
      // Helpjuice-specific: article-body or content-body classes
      /<div[^>]*class="[^"]*(?:article|content)[_-]?body[^"]*"[^>]*>[\s\S]*$/i,
      // Helpjuice also uses .document-content or #article-content
      /<div[^>]*(?:id|class)="[^"]*(?:document-content|article-content|answer-body)[^"]*"[^>]*>[\s\S]*$/i,
      // Generic article tag
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      // Common CMS patterns
      /<div[^>]*class="[^"]*(?:entry|post|content)[_-]?(?:body|content|text)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*id="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*$/im,
      /<main[^>]*>([\s\S]*?)<\/main>/i,
    ];

    for (const pattern of contentPatterns) {
      const match = fullHtml.match(pattern);
      if (match && match[0].length > 200) {
        articleHtml = match[0];
        break;
      }
    }

    // Also extract <style> blocks for CSS class analysis
    const styleBlocks: string[] = [];
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let styleMatch;
    while ((styleMatch = styleRegex.exec(fullHtml)) !== null) {
      styleBlocks.push(styleMatch[1]);
    }

    // Trim if too long (keep room for Claude analysis)
    if (articleHtml.length > 30000) {
      articleHtml = articleHtml.slice(0, 30000);
    }
    const cssContext = styleBlocks.join('\n').slice(0, 10000);

    // Step 3: If analyze=false, return raw HTML (backward compat)
    if (!analyze) {
      return Response.json({ html: articleHtml });
    }

    // Step 4: Use Claude to analyze CSS classes and generate prompt + template
    const anthropic = new Anthropic();

    const claudeInput = `## Extracted Article HTML
\`\`\`html
${articleHtml}
\`\`\`

${cssContext ? `## Page CSS Styles\n\`\`\`css\n${cssContext}\n\`\`\`` : ''}

## Source URL
${url}`;

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [
        { role: 'user', content: claudeInput },
      ],
      system: ANALYSIS_PROMPT,
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';

    // Parse Claude's JSON response
    try {
      // Try to extract JSON from the response (handle potential markdown fences)
      const jsonStr = text.replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      const result = JSON.parse(jsonStr);

      return Response.json({
        detectedPlatform: result.platformName ?? 'Custom',
        htmlPrompt: result.htmlPrompt ?? '',
        htmlTemplate: result.htmlTemplate ?? '',
        rawHtml: articleHtml,
      });
    } catch {
      // If JSON parsing fails, return what we can
      return Response.json({
        detectedPlatform: 'Custom',
        htmlPrompt: '',
        htmlTemplate: articleHtml,
        rawHtml: articleHtml,
        parseError: 'Could not parse AI analysis. Raw HTML provided as template.',
      });
    }
  } catch {
    return Response.json(
      { error: 'Failed to scrape website. Please check the URL and try again.' },
      { status: 500 }
    );
  }
}
