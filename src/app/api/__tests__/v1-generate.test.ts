import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted ensures these run before the hoisted vi.mock calls
const { mockValidateApiKey, mockCheck, mockCheckQuota, mockRunPhaseA, mockFlushUsageLogs } = vi.hoisted(() => ({
  mockValidateApiKey: vi.fn<(key: string) => Promise<string | null>>().mockResolvedValue('user-1'),
  mockCheck: vi.fn().mockResolvedValue({ ok: true, remaining: 4, retryAfterMs: 0 }),
  mockCheckQuota: vi.fn().mockResolvedValue({ allowed: true, usage: null }),
  mockRunPhaseA: vi.fn(),
  mockFlushUsageLogs: vi.fn().mockResolvedValue(undefined),
}));

// Track which table is being queried to return appropriate mock data
const { mockQueryData } = vi.hoisted(() => {
  const defaultData: Record<string, unknown> = {
    user_settings: { active_workspace_id: 'ws-1' },
    workspaces: { id: 'ws-1', user_id: 'user-1', company_name: 'Test Co', company_description: null, industry: null, target_audience: null, branding: null },
    workspace_preferences: { selected_article_type_id: 'at-1', selected_platform_id: null },
    article_types: { id: 'at-1', name: 'How-To', draft_prompt: 'Write a draft', structure_prompt: 'Structure it' },
    articles: { id: 'article-1' },
  };

  return {
    mockQueryData: { ...defaultData },
  };
});

vi.mock('@/lib/api-keys', () => ({
  validateApiKey: mockValidateApiKey,
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => ({
    check: mockCheck,
  })),
}));

vi.mock('@/lib/supabase/queries', () => ({
  checkQuota: mockCheckQuota,
}));

vi.mock('@/lib/pipeline', () => ({
  runPhaseA: mockRunPhaseA,
  runPhaseB: vi.fn(),
}));

vi.mock('@/lib/usage-logger', () => ({
  flushUsageLogs: mockFlushUsageLogs,
}));

// Mock @supabase/supabase-js createClient (admin client used in route)
vi.mock('@supabase/supabase-js', () => {
  function buildChain(tableName: string) {
    const chain: Record<string, unknown> = {};

    const resolveData = (data: unknown) => Promise.resolve({ data, error: null });
    const resolveArray = (data: unknown) => Promise.resolve({ data: data ? [data] : [], error: null });

    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);
    chain.limit = vi.fn().mockReturnValue(chain);
    chain.maybeSingle = vi.fn(() => resolveData(mockQueryData[tableName] ?? null));
    chain.single = vi.fn(() => resolveData(mockQueryData[tableName] ?? null));
    chain.insert = vi.fn().mockReturnValue(chain);

    // Make chain itself thenable for queries that don't end with maybeSingle/single
    // (e.g. .from('workspaces').select('id').eq(...).order(...).limit(1))
    chain.then = vi.fn((resolve: (v: unknown) => void) => {
      resolve({ data: mockQueryData[tableName] ? [mockQueryData[tableName]] : [], error: null });
    });

    return chain;
  }

  return {
    createClient: vi.fn(() => ({
      from: vi.fn((table: string) => buildChain(table)),
    })),
  };
});

import { POST } from '@/app/api/v1/generate/route';

function makeRequest(options: { auth?: string; body?: unknown } = {}): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.auth !== undefined) {
    headers['Authorization'] = options.auth;
  }
  return new Request('http://localhost/api/v1/generate', {
    method: 'POST',
    headers,
    body: JSON.stringify(options.body ?? { videoUrl: 'https://loom.com/share/abc123' }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();

  // Reset defaults
  mockValidateApiKey.mockResolvedValue('user-1');
  mockCheck.mockResolvedValue({ ok: true, remaining: 4, retryAfterMs: 0 });
  mockCheckQuota.mockResolvedValue({ allowed: true, usage: null });
  mockFlushUsageLogs.mockResolvedValue(undefined);

  // Default: Phase A returns a structured article
  mockRunPhaseA.mockImplementation(async (_opts: unknown, onProgress: (e: unknown) => void) => {
    onProgress({ step: 'review', status: 'done', article: '# Test Article\n\nContent here.' });
  });

  // Reset query data
  mockQueryData.user_settings = { active_workspace_id: 'ws-1' };
  mockQueryData.workspaces = { id: 'ws-1', user_id: 'user-1', company_name: 'Test Co', company_description: null, industry: null, target_audience: null, branding: null };
  mockQueryData.workspace_preferences = { selected_article_type_id: 'at-1', selected_platform_id: null };
  mockQueryData.article_types = { id: 'at-1', name: 'How-To', draft_prompt: 'Write a draft', structure_prompt: 'Structure it' };
  mockQueryData.articles = { id: 'article-1' };
});

describe('POST /api/v1/generate', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await POST(makeRequest({ body: { videoUrl: 'https://example.com' } }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain('Authorization');
  });

  it('returns 401 when Authorization header does not start with "Bearer "', async () => {
    const res = await POST(makeRequest({ auth: 'Basic abc123', body: { videoUrl: 'https://example.com' } }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain('Authorization');
  });

  it('returns 401 when API key does not start with "vtk_"', async () => {
    const res = await POST(makeRequest({ auth: 'Bearer sk_invalid_key', body: { videoUrl: 'https://example.com' } }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain('vtk_');
  });

  it('returns 401 when validateApiKey returns null (invalid key)', async () => {
    mockValidateApiKey.mockResolvedValue(null);
    const res = await POST(makeRequest({ auth: 'Bearer vtk_invalid_key_hash', body: { videoUrl: 'https://example.com' } }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain('Invalid');
  });

  it('returns 429 when rate limited', async () => {
    mockCheck.mockResolvedValue({ ok: false, remaining: 0, retryAfterMs: 60000 });
    const res = await POST(makeRequest({ auth: 'Bearer vtk_valid_key_abcdef123456', body: { videoUrl: 'https://example.com' } }));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('60');
    const json = await res.json();
    expect(json.error).toContain('Rate limit');
  });

  it('returns 400 when body has no videoUrl and no transcript', async () => {
    const res = await POST(makeRequest({ auth: 'Bearer vtk_valid_key_abcdef123456', body: {} }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('videoUrl');
  });

  it('returns 400 when no workspace found for user', async () => {
    mockQueryData.user_settings = null;
    mockQueryData.workspaces = null;
    const res = await POST(makeRequest({ auth: 'Bearer vtk_valid_key_abcdef123456', body: { videoUrl: 'https://example.com' } }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('workspace');
  });

  it('returns 400 when no article type specified and no default set', async () => {
    mockQueryData.workspace_preferences = { selected_article_type_id: null, selected_platform_id: null };
    const res = await POST(makeRequest({ auth: 'Bearer vtk_valid_key_abcdef123456', body: { videoUrl: 'https://example.com' } }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('article type');
  });

  it('returns JSON with article data for valid request', async () => {
    const res = await POST(makeRequest({ auth: 'Bearer vtk_valid_key_abcdef123456', body: { videoUrl: 'https://example.com' } }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe('article-1');
    expect(json.title).toBe('Test Article');
    expect(json.markdown).toContain('Content here');
    expect(json.articleType).toBe('How-To');
  });
});
