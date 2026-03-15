import { describe, it, expect, vi } from 'vitest';
import { getWorkspaceStats } from '@/lib/supabase/queries';

function mockSupabase(rpcResult: { data: unknown; error: unknown }) {
  return {
    rpc: vi.fn().mockResolvedValue(rpcResult),
  } as unknown as Parameters<typeof getWorkspaceStats>[0];
}

describe('getWorkspaceStats', () => {
  it('maps RPC response from snake_case to camelCase with bySource', async () => {
    const supabase = mockSupabase({
      data: {
        total_articles: 42,
        this_week: 5,
        this_month: 12,
        youtube_count: 20,
        loom_count: 10,
        google_drive_count: 8,
        paste_count: 4,
      },
      error: null,
    });

    const result = await getWorkspaceStats(supabase, 'ws-123');

    expect(supabase.rpc).toHaveBeenCalledWith('get_workspace_stats', { p_workspace_id: 'ws-123' });
    expect(result).toEqual({
      totalArticles: 42,
      thisWeek: 5,
      thisMonth: 12,
      bySource: {
        youtube: 20,
        loom: 10,
        'google-drive': 8,
        paste: 4,
      },
    });
  });

  it('returns zeroed stats when RPC returns null', async () => {
    const supabase = mockSupabase({ data: null, error: null });

    const result = await getWorkspaceStats(supabase, 'ws-123');

    expect(result).toEqual({
      totalArticles: 0,
      thisWeek: 0,
      thisMonth: 0,
      bySource: { youtube: 0, loom: 0, 'google-drive': 0, paste: 0 },
    });
  });

  it('returns zeroed stats when RPC returns empty array', async () => {
    const supabase = mockSupabase({ data: [], error: null });

    const result = await getWorkspaceStats(supabase, 'ws-123');

    expect(result).toEqual({
      totalArticles: 0,
      thisWeek: 0,
      thisMonth: 0,
      bySource: { youtube: 0, loom: 0, 'google-drive': 0, paste: 0 },
    });
  });

  it('throws on RPC error', async () => {
    const supabase = mockSupabase({ data: null, error: { message: 'RPC failed' } });

    await expect(getWorkspaceStats(supabase, 'ws-123')).rejects.toThrow('Failed to get workspace stats: RPC failed');
  });

  it('converts BigInt string values via Number()', async () => {
    const supabase = mockSupabase({
      data: {
        total_articles: '999',
        this_week: '10',
        this_month: '50',
        youtube_count: '200',
        loom_count: '100',
        google_drive_count: '80',
        paste_count: '40',
      },
      error: null,
    });

    const result = await getWorkspaceStats(supabase, 'ws-123');

    expect(result).toEqual({
      totalArticles: 999,
      thisWeek: 10,
      thisMonth: 50,
      bySource: { youtube: 200, loom: 100, 'google-drive': 80, paste: 40 },
    });
  });
});
