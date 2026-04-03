import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { searchSupportDocs, generateSupportResponse } from '@/lib/support/chat';
import type { ChatMessage } from '@/lib/support/chat';

// Tiered rate limits resolved per-request based on plan
const freeLimiter = rateLimit({ tokens: 5, interval: 3_600_000 });    // 5/hour
const starterLimiter = rateLimit({ tokens: 15, interval: 3_600_000 }); // 15/hour
const teamLimiter = rateLimit({ tokens: 30, interval: 3_600_000 });    // 30/hour

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Determine plan for rate limiting
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const planId = sub?.plan_id ?? 'free';
  const limiter = planId === 'team' || planId === 'enterprise' ? teamLimiter
    : planId === 'starter' ? starterLimiter
    : freeLimiter;

  const rl = await limiter.check(user.id);
  if (!rl.ok) {
    return Response.json({
      error: 'You have reached your support chat limit. Please try again later.',
      retryAfterMs: rl.retryAfterMs,
    }, { status: 429 });
  }

  // Parse request
  let message: string;
  let conversationId: string | null;
  try {
    const body = await req.json();
    message = (body.message ?? '').trim();
    conversationId = body.conversationId ?? null;
    if (!message || message.length > 500) {
      return Response.json({ error: 'Message must be 1-500 characters' }, { status: 400 });
    }
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Load or create conversation
  if (!conversationId) {
    const { data: conv, error: convErr } = await supabase
      .from('support_conversations')
      .insert({ user_id: user.id })
      .select('id')
      .single();
    if (convErr || !conv) {
      return Response.json({ error: 'Failed to create conversation' }, { status: 500 });
    }
    conversationId = conv.id;
  }

  // Check conversation message count (max 15 messages per conversation)
  const { count } = await supabase
    .from('support_messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId);

  if ((count ?? 0) >= 15) {
    return Response.json({
      error: 'This conversation has reached its limit. Please start a new one or contact our team.',
      conversationId,
    }, { status: 400 });
  }

  // Save user message
  await supabase.from('support_messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content: message,
  });

  // Load conversation history
  const { data: historyRows } = await supabase
    .from('support_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(10);

  const history: ChatMessage[] = (historyRows ?? [])
    .slice(0, -1) // exclude the message we just inserted (it goes in the prompt)
    .map((r: { role: string; content: string }) => ({
      role: r.role as 'user' | 'assistant',
      content: r.content,
    }));

  // Search support docs
  const docs = await searchSupportDocs(message);

  // Generate streaming response
  const stream = await generateSupportResponse(message, history, docs);

  // Collect full response for saving
  const [streamForClient, streamForSave] = stream.tee();

  // Save assistant response in background
  saveAssistantMessage(streamForSave, supabase, conversationId!, docs).catch(console.error);

  return new Response(streamForClient, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Conversation-Id': conversationId!,
    },
  });
}

async function saveAssistantMessage(
  stream: ReadableStream,
  supabase: Awaited<ReturnType<typeof createClient>>,
  conversationId: string,
  docs: { docTitle: string; category: string }[],
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
      try {
        const parsed = JSON.parse(line.slice(6));
        if (parsed.type === 'text') fullText += parsed.content;
      } catch { /* skip */ }
    }
  }

  if (fullText) {
    const sources = docs.map(d => ({ title: d.docTitle, category: d.category }));
    await supabase.from('support_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: fullText,
      sources: sources.length > 0 ? sources : null,
    });
  }
}
