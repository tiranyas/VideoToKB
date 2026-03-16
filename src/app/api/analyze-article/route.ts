import Anthropic from '@anthropic-ai/sdk';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { validateUrl } from '@/lib/url-validation';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const limiter = rateLimit({ tokens: 5, interval: 60_000 });

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await limiter.check(user.id);
  if (!rl.ok) {
    return Response.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  let body: { url?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { url, content } = body;
  if (!url && !content) {
    return Response.json({ error: 'url or content is required' }, { status: 400 });
  }

  try {
    let articleContent = content ?? '';

    // If URL provided, scrape the article
    if (url && !content) {
      const validation = validateUrl(url);
      if (!validation.ok) {
        return Response.json({ error: validation.reason }, { status: 400 });
      }

      const response = await fetch(validation.url.toString(), {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KBPipe/1.0)' },
      });

      if (!response.ok) {
        return Response.json(
          { error: `Failed to fetch URL (status ${response.status})` },
          { status: 400 }
        );
      }

      const html = await response.text();

      // Extract main content
      const contentPatterns = [
        /<div[^>]*class="[^"]*article[_-]?body[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i,
        /<article[^>]*>([\s\S]*?)<\/article>/i,
        /<div[^>]*id="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*$/im,
        /<main[^>]*>([\s\S]*?)<\/main>/i,
      ];

      for (const pattern of contentPatterns) {
        const match = html.match(pattern);
        if (match && match[0].length > 200) {
          articleContent = match[0];
          break;
        }
      }

      if (!articleContent) {
        articleContent = html;
      }

      if (articleContent.length > 40000) {
        articleContent = articleContent.slice(0, 40000);
      }
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    const start = Date.now();
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: `You are an expert at analyzing knowledge base articles and extracting their writing style, tone, and structure patterns.

Analyze the provided article and extract:

1. **Style Analysis** — Return a JSON object with:
   - tone: One of "formal", "casual", "technical", "friendly"
   - length: One of "concise", "standard", "detailed"
   - structure: One of "step-by-step", "narrative", "faq-heavy", "reference"
   - audience: One of "end-users", "developers", "managers", "mixed"

2. **Draft Prompt** — Write a system prompt that would instruct an AI to create a draft article in this EXACT style. The prompt should capture:
   - Writing voice and tone
   - Level of detail
   - Use of examples/analogies
   - Sentence length and complexity
   - Use of jargon vs plain language

3. **Structure Prompt** — Write a system prompt that would instruct an AI to structure an article following this EXACT pattern. The prompt should capture:
   - Section headings used (and their order)
   - How introductions and conclusions are written
   - Formatting patterns (bullets, numbered lists, tables, callouts)
   - FAQ style (if any)
   - Overall document outline

Return a JSON object with:
{
  "controls": { "tone": "...", "length": "...", "structure": "...", "audience": "..." },
  "draftPrompt": "...",
  "structurePrompt": "...",
  "summary": "A 1-2 sentence description of the detected style"
}

Return ONLY the JSON object, no markdown fences or explanations.`,
      messages: [
        {
          role: 'user',
          content: `Analyze this article and extract its writing style:\n\n${articleContent}`,
        },
      ],
    });
    const durationMs = Date.now() - start;

    // Log usage
    try {
      const admin = createSupabaseAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await admin.from('api_usage_logs').insert({
        user_id: user.id,
        model: 'claude-sonnet-4-6',
        agent: 'analyze-article',
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
        duration_ms: durationMs,
      });
    } catch {
      // Don't fail if logging fails
    }

    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return Response.json({ error: 'Failed to analyze article' }, { status: 500 });
    }

    const jsonStr = textBlock.text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    return Response.json({
      controls: parsed.controls ?? {},
      draftPrompt: parsed.draftPrompt ?? '',
      structurePrompt: parsed.structurePrompt ?? '',
      summary: parsed.summary ?? '',
    });
  } catch {
    return Response.json(
      { error: 'Failed to analyze article. Please check the URL and try again.' },
      { status: 500 }
    );
  }
}
