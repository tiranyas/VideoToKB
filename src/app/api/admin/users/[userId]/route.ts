import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateSubscriptionPlan, addBonusCredits } from '@/lib/supabase/queries';
import type { PlanId } from '@/types';

const ADMIN_EMAILS = ['tiran@kbify.com', 'tiranyas@gmail.com'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { userId } = await params;
  const body = await request.json();

  try {
    if (body.action === 'change_plan') {
      await updateSubscriptionPlan(supabase, userId, body.planId as PlanId);
      return NextResponse.json({ ok: true, message: `Plan updated to ${body.planId}` });
    }

    if (body.action === 'add_credits') {
      await addBonusCredits(supabase, userId, Number(body.credits));
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
