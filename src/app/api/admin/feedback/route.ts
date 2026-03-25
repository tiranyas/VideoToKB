import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

const ADMIN_EMAILS = ['tiran@kbpipe.com', 'tiranyas@gmail.com'];

function getAdmin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Use service role to access auth.users for email lookup
  const admin = getAdmin();

  const { data: feedbackRows, error } = await admin
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch user emails for all unique user_ids
  const userIds = [...new Set((feedbackRows ?? []).map(f => f.user_id))];
  const emailMap: Record<string, string> = {};

  if (userIds.length > 0) {
    const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (usersData?.users) {
      for (const u of usersData.users) {
        if (userIds.includes(u.id)) {
          emailMap[u.id] = u.email ?? u.id;
        }
      }
    }
  }

  // Enrich feedback with user email
  const feedback = (feedbackRows ?? []).map(f => ({
    ...f,
    userEmail: emailMap[f.user_id] ?? f.user_id,
  }));

  return NextResponse.json({ feedback });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id, status, adminNotes } = await req.json();
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const admin = getAdmin();
  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (adminNotes !== undefined) updates.admin_notes = adminNotes;
  if (status === 'resolved') updates.resolved_at = new Date().toISOString();

  const { error } = await admin
    .from('feedback')
    .update(updates)
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
