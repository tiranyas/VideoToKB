import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

const limiter = rateLimit({ tokens: 3, interval: 3_600_000 }); // 3 escalations per hour

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await limiter.check(user.id);
  if (!rl.ok) {
    return Response.json({ error: 'Too many escalations. Please try again later.' }, { status: 429 });
  }

  let conversationId: string;
  try {
    const body = await req.json();
    conversationId = body.conversationId;
    if (!conversationId) throw new Error('Missing conversationId');
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Verify ownership and update status
  const { data: conv, error: convErr } = await supabase
    .from('support_conversations')
    .update({ status: 'escalated', escalated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', conversationId)
    .eq('user_id', user.id)
    .select('id')
    .single();

  if (convErr || !conv) {
    return Response.json({ error: 'Conversation not found' }, { status: 404 });
  }

  // Load messages for email
  const { data: messages } = await supabase
    .from('support_messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  // Send email notification via Resend
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'KBPipe Support <support@kbpipe.io>',
      to: process.env.SUPPORT_EMAIL ?? 'support@kbpipe.io',
      subject: `[Support Escalation] ${user.email ?? user.id}`,
      html: `
        <h2>Support Escalation</h2>
        <p><strong>User:</strong> ${user.email ?? user.id}</p>
        <p><strong>Conversation ID:</strong> ${conversationId}</p>
        <hr/>
        <h3>Conversation:</h3>
        ${(messages ?? []).map((m: { role: string; content: string }) =>
          `<p><strong>${m.role === 'user' ? 'User' : 'Bot'}:</strong> ${m.content}</p>`
        ).join('')}
      `,
    });
  } catch (err) {
    console.error('[Support] Failed to send escalation email:', err);
    // Non-blocking — escalation is saved in DB regardless
  }

  return Response.json({ ok: true });
}
