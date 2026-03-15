import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ADMIN_EMAILS = ['tiran@kbify.com', 'tiranyas@gmail.com'];

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const days = Math.min(parseInt(searchParams.get('days') ?? '30') || 30, 365);

  // Get usage breakdown by model + agent
  const { data: byAgent, error: agentError } = await supabase
    .rpc('get_api_usage_stats', { p_days: days });

  if (agentError) {
    return NextResponse.json({ error: agentError.message }, { status: 500 });
  }

  // Get daily usage
  const { data: daily, error: dailyError } = await supabase
    .rpc('get_api_usage_daily', { p_days: days });

  if (dailyError) {
    return NextResponse.json({ error: dailyError.message }, { status: 500 });
  }

  // Compute totals
  const totals = (byAgent ?? []).reduce(
    (acc: { calls: number; inputTokens: number; outputTokens: number; cost: number }, row: Record<string, unknown>) => {
      acc.calls += Number(row.total_calls ?? 0);
      acc.inputTokens += Number(row.total_input_tokens ?? 0);
      acc.outputTokens += Number(row.total_output_tokens ?? 0);
      acc.cost += Number(row.total_cost_estimate ?? 0);
      return acc;
    },
    { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 }
  );

  return NextResponse.json({
    period: `${days} days`,
    totals,
    byAgent: (byAgent ?? []).map((row: Record<string, unknown>) => ({
      model: row.model,
      agent: row.agent,
      calls: Number(row.total_calls),
      inputTokens: Number(row.total_input_tokens),
      outputTokens: Number(row.total_output_tokens),
      totalTokens: Number(row.total_tokens),
      avgDurationMs: Number(row.avg_duration_ms),
      costEstimate: Number(row.total_cost_estimate),
    })),
    daily: (daily ?? []).map((row: Record<string, unknown>) => ({
      day: row.day,
      calls: Number(row.total_calls),
      inputTokens: Number(row.total_input_tokens),
      outputTokens: Number(row.total_output_tokens),
      costEstimate: Number(row.total_cost_estimate),
    })),
  });
}
