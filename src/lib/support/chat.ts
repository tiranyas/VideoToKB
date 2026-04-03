/**
 * Support chat core logic: search docs → Claude Haiku → response.
 */

import Anthropic from '@anthropic-ai/sdk';
import { getAdminClient } from '@/lib/supabase/admin';

const anthropic = new Anthropic();

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface DocMatch {
  docTitle: string;
  category: string;
  content: string;
  rank: number;
}

const SYSTEM_PROMPT = `You are KBPipe's support assistant. You help users with questions about the KBPipe platform.

STRICT RULES:
1. ONLY answer based on the documentation excerpts provided in <context> tags.
2. If the documentation does not contain the answer, say: "I don't have specific information about that. Would you like me to forward this to the KBPipe team?"
3. NEVER guess, speculate, or make up features, steps, or information.
4. NEVER answer questions unrelated to KBPipe. If asked about anything else, say: "I can only help with KBPipe-related questions."
5. Keep answers concise and actionable — use numbered steps for how-to questions.
6. When citing information, mention the source naturally (e.g., "You can find this in Settings > AI Agents").
7. Be friendly and professional. Use plain English.
8. If the user reports a bug or something that seems broken, suggest they forward to the team.
9. Do NOT use markdown headers (#). Use plain text with numbered lists and bold (**) for emphasis.`;

/**
 * Search support docs using full-text search.
 */

export async function searchSupportDocs(query: string, limit = 5): Promise<DocMatch[]> {
  const supabase = getAdminClient();

  const { data, error } = await supabase.rpc('search_support_docs', {
    p_query: query,
    p_limit: limit,
  });

  if (error) {
    console.error('[Support] Search error:', error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    docTitle: row.doc_title as string,
    category: row.doc_category as string,
    content: row.content as string,
    rank: row.rank as number,
  }));
}

/**
 * Generate a support chat response using Claude Haiku with RAG context.
 */
export async function generateSupportResponse(
  userMessage: string,
  conversationHistory: ChatMessage[],
  docs: DocMatch[],
): Promise<ReadableStream> {
  const contextBlock = docs.length > 0
    ? `<context>\n${docs.map((d, i) => `[${i + 1}] ${d.docTitle} (${d.category}):\n${d.content}`).join('\n\n')}\n</context>`
    : '<context>\nNo relevant documentation found for this query.\n</context>';

  const messages: Anthropic.MessageParam[] = [
    // Include recent conversation history (last 8 messages max)
    ...conversationHistory.slice(-8).map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    {
      role: 'user',
      content: `${contextBlock}\n\nUser question: ${userMessage}`,
    },
  ];

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages,
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('');

  const sources = docs.length > 0
    ? docs.map(d => ({ title: d.docTitle, category: d.category }))
    : [];

  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      if (text) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`));
      }
      if (sources.length > 0) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
}
