import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js';
import type { PlanId } from '@/types';

const ADMIN_EMAILS = ['tiran@kbpipe.com', 'tiranyas@gmail.com'];

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function updateSubscriptionPlanAdmin(admin: SupabaseClient, userId: string, planId: PlanId) {
  const { error } = await admin
    .from('subscriptions')
    .update({ plan_id: planId, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

async function addBonusCreditsAdmin(admin: SupabaseClient, userId: string, credits: number) {
  const { data, error: fetchError } = await admin
    .from('subscriptions')
    .select('bonus_credits')
    .eq('user_id', userId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const { error } = await admin
    .from('subscriptions')
    .update({
      bonus_credits: (data.bonus_credits ?? 0) + credits,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  // Auth check with SSR client
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const admin = getAdminClient();
  const { userId } = await params;
  const body = await request.json();

  try {
    if (body.action === 'change_plan') {
      await updateSubscriptionPlanAdmin(admin, userId, body.planId as PlanId);
      return NextResponse.json({ ok: true, message: `Plan updated to ${body.planId}` });
    }

    if (body.action === 'add_credits') {
      await addBonusCreditsAdmin(admin, userId, Number(body.credits));
      return NextResponse.json({ ok: true, message: `Added ${body.credits} bonus credits` });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
