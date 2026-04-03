'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, X, Send, Loader2, ArrowUpRight, RotateCcw, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: { title: string; category: string }[];
}

export function SupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isEscalated, setIsEscalated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  function handleNewConversation() {
    setMessages([]);
    setConversationId(null);
    setIsEscalated(false);
    setError(null);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    if (!isOpen) setIsOpen(true);
    setInput('');
    setError(null);
    setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, conversationId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to get response');
      }

      const convId = res.headers.get('X-Conversation-Id');
      if (convId) setConversationId(convId);

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let assistantContent = '';
      let sources: { title: string; category: string }[] = [];

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.type === 'text') {
              assistantContent += parsed.content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                return updated;
              });
            } else if (parsed.type === 'sources') {
              sources = parsed.sources;
            } else if (parsed.type === 'error') {
              throw new Error(parsed.message);
            }
          } catch { /* skip */ }
        }
      }

      if (sources.length > 0) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], sources };
          return updated;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setMessages(prev => {
        if (prev.length > 0 && prev[prev.length - 1].role === 'assistant' && !prev[prev.length - 1].content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleEscalate() {
    if (!conversationId || isEscalated) return;
    try {
      const res = await fetch('/api/support/escalate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });
      if (res.ok) {
        setIsEscalated(true);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Your conversation has been forwarded to the KBPipe team. We\'ll get back to you via email shortly!',
        }]);
      }
    } catch {
      setError('Failed to escalate. Please try again.');
    }
  }

  function handleSuggestion(q: string) {
    setInput(q);
    // Auto-submit the suggestion
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    setInput('');
    setError(null);
    if (!isOpen) setIsOpen(true);
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setIsLoading(true);

    fetch('/api/support/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: q, conversationId }),
    }).then(async (res) => {
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to get response');
      }
      const convId = res.headers.get('X-Conversation-Id');
      if (convId) setConversationId(convId);
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');
      const decoder = new TextDecoder();
      let assistantContent = '';
      let sources: { title: string; category: string }[] = [];
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.type === 'text') {
              assistantContent += parsed.content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                return updated;
              });
            } else if (parsed.type === 'sources') { sources = parsed.sources; }
          } catch { /* skip */ }
        }
      }
      if (sources.length > 0) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], sources };
          return updated;
        });
      }
    }).catch(err => {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setMessages(prev => {
        if (prev.length > 0 && prev[prev.length - 1].role === 'assistant' && !prev[prev.length - 1].content) return prev.slice(0, -1);
        return prev;
      });
    }).finally(() => setIsLoading(false));
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
      <div className="w-full max-w-2xl px-4 pb-4 pointer-events-auto">

        {/* Chat panel — slides up when open */}
        {isOpen && (
          <div className="mb-2 flex flex-col h-[420px] rounded-2xl bg-white shadow-2xl shadow-gray-300/40 border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500" />
                <span className="text-sm font-semibold text-gray-800">KBPipe Support</span>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={handleNewConversation}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    title="New conversation"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
                {messages.length > 0 && conversationId && !isEscalated && (
                  <button
                    onClick={handleEscalate}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                    title="Forward to team"
                  >
                    <ArrowUpRight className="h-3 w-3" />
                    Forward to team
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500">Ask about features, billing, integrations, or troubleshooting</p>
                  <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                    {['How do I create an article?', 'What plans are available?', 'How to connect HelpJuice?'].map(q => (
                      <button
                        key={q}
                        onClick={() => handleSuggestion(q)}
                        className="text-xs text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-full px-3 py-1.5 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-violet-600 text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-800 rounded-bl-md'
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-1.5 pt-1.5 border-t border-gray-200/40">
                        {msg.sources.map((s, j) => (
                          <span key={j} className="inline-block text-[10px] bg-white/70 text-gray-400 rounded px-1.5 py-0.5 mr-1">
                            {s.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                </div>
              )}

              {error && (
                <div className="text-center">
                  <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-1.5 inline-block">{error}</p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input inside panel */}
            <form onSubmit={handleSend} className="border-t border-gray-100 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isEscalated ? 'Forwarded to team' : 'Ask a question...'}
                  disabled={isLoading || isEscalated}
                  maxLength={500}
                  className="flex-1 rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2 text-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100 transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim() || isEscalated}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl transition-all shrink-0',
                    isLoading || !input.trim() || isEscalated
                      ? 'bg-gray-100 text-gray-300'
                      : 'bg-violet-600 text-white hover:bg-violet-700'
                  )}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Bottom chat bar — always visible */}
        {!isOpen && (
          <form onSubmit={handleSend} className="flex items-center gap-2 rounded-2xl bg-white shadow-lg shadow-gray-200/50 border border-gray-200 px-4 py-2.5">
            <Sparkles className="h-4 w-4 text-violet-400 shrink-0" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask KBPipe AI anything..."
              maxLength={500}
              className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
              onFocus={() => {
                if (messages.length > 0) setIsOpen(true);
              }}
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg transition-all shrink-0',
                !input.trim()
                  ? 'text-gray-300'
                  : 'text-violet-600 hover:bg-violet-50'
              )}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
