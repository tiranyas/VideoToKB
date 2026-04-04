/**
 * Helpjuice API v3 client
 * Docs: https://help.helpjuice.com/api-v3/using-api-v3
 */

export interface HelpjuiceCategory {
  id: number;
  name: string;
  codename: string;
  description?: string;
}

export interface HelpjuiceArticleResult {
  id: number;
  name: string;
  codename: string;
  url?: string;
}

function baseUrl(subdomain: string): string {
  return `https://${subdomain}.helpjuice.com/api/v3`;
}

const API_TIMEOUT_MS = 10_000; // 10s timeout for Helpjuice API calls

function headers(apiKey: string): HeadersInit {
  return {
    Authorization: apiKey,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

/**
 * Test connection by fetching categories (lightweight call)
 */
export async function testConnection(
  apiKey: string,
  subdomain: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${baseUrl(subdomain)}/categories`, {
      method: 'GET',
      headers: headers(apiKey),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      if (res.status === 401 || res.status === 403) {
        return { ok: false, error: 'Invalid API key' };
      }
      return { ok: false, error: `Helpjuice returned ${res.status}: ${text}` };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Connection failed' };
  }
}

/**
 * Fetch all categories
 */
export async function fetchCategories(
  apiKey: string,
  subdomain: string
): Promise<HelpjuiceCategory[]> {
  const res = await fetch(`${baseUrl(subdomain)}/categories`, {
    method: 'GET',
    headers: headers(apiKey),
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch categories: ${res.status}`);
  }

  const data = await res.json();
  return (data.categories ?? []).map((c: Record<string, unknown>) => ({
    id: c.id as number,
    name: c.name as string,
    codename: c.codename as string,
    description: (c.description as string) ?? undefined,
  }));
}

/**
 * Publish article as draft to Helpjuice
 */
export async function publishDraft(
  apiKey: string,
  subdomain: string,
  opts: { title: string; body: string; categoryId: number }
): Promise<HelpjuiceArticleResult> {
  const res = await fetch(`${baseUrl(subdomain)}/articles`, {
    method: 'POST',
    headers: headers(apiKey),
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
    body: JSON.stringify({
      article: {
        name: opts.title,
        body: opts.body,
        published: false,
        category_ids: [opts.categoryId],
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to create article: ${res.status} ${text}`);
  }

  const data = await res.json();
  const article = data.article ?? data;
  return {
    id: article.id,
    name: article.name,
    codename: article.codename ?? '',
    url: `https://${subdomain}.helpjuice.com/articles/${article.codename ?? article.id}`,
  };
}
