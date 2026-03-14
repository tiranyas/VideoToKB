import { createClient } from '@/lib/supabase/server';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
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

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VideoToKB/1.0)' },
    });

    if (!response.ok) {
      return Response.json(
        { error: `Failed to fetch URL: ${response.status}` },
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: `Template scraping failed: ${message}` }, { status: 500 });
  }
}
