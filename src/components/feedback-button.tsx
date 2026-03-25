'use client';

import { useState } from 'react';
import { MessageSquarePlus, X, Send, Loader2, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import { useErrorCapture } from '@/hooks/use-error-capture';

interface FeedbackContext {
  articleId?: string;
  articleTitle?: string;
  workspaceId?: string;
  articleTypeId?: string;
  platformId?: string;
  platformName?: string;
}

const CATEGORIES = [
  { value: 'bug', label: 'Bug', emoji: '🐛' },
  { value: 'quality', label: 'Content Quality', emoji: '📝' },
  { value: 'styling', label: 'Styling Issue', emoji: '🎨' },
  { value: 'feature', label: 'Feature Request', emoji: '💡' },
  { value: 'other', label: 'Other', emoji: '💬' },
] as const;

export function FeedbackButton({ context }: { context?: FeedbackContext }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>('bug');
  const [description, setDescription] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { getErrorLogs } = useErrorCapture();

  async function handleSubmit() {
    if (!description.trim()) {
      toast.error('Please describe the issue');
      return;
    }

    setSubmitting(true);
    try {
      // Attach error logs for bug reports
      const errorLogs = category === 'bug' ? getErrorLogs() : undefined;

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...context,
          category,
          description: description.trim(),
          expectedBehavior: expectedBehavior.trim() || undefined,
          severity: category === 'bug' ? 'high' : 'medium',
          consoleErrors: errorLogs?.consoleErrors,
          networkErrors: errorLogs?.networkErrors,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to submit');
      }

      toast.success('Thanks for the feedback! Check your email for confirmation.');
      setOpen(false);
      setDescription('');
      setExpectedBehavior('');
      setCategory('bug');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-gray-900/20 hover:bg-gray-800 transition-all hover:scale-105"
        aria-label="Report an issue"
      >
        <MessageSquarePlus className="h-4 w-4" />
        <span className="hidden sm:inline">Report Issue</span>
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Report an Issue</h3>
                {context?.articleTitle && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[280px]">
                    Article: {context.articleTitle}
                  </p>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Category pills */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                        category === cat.value
                          ? 'bg-violet-100 text-violet-700 ring-1 ring-violet-300'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      )}
                    >
                      {cat.emoji} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  What happened?
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe the issue..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all resize-none"
                  autoFocus
                />
              </div>

              {/* Expected behavior (optional) */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  What did you expect? <span className="text-gray-300">(optional)</span>
                </label>
                <textarea
                  value={expectedBehavior}
                  onChange={(e) => setExpectedBehavior(e.target.value)}
                  rows={2}
                  placeholder="What should have happened instead..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all resize-none"
                />
              </div>

              {/* Bug report indicator */}
              {category === 'bug' && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-700">
                  <Terminal className="h-3.5 w-3.5 flex-shrink-0" />
                  Console errors and failed network requests will be attached automatically
                </div>
              )}

              {/* Auto-captured context info */}
              {context && (context.platformName || context.articleTypeId) && (
                <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400">
                  <span className="font-medium text-gray-500">Auto-captured:</span>{' '}
                  {[
                    context.platformName && `Platform: ${context.platformName}`,
                    context.articleId && `Article ID: ${context.articleId.slice(0, 8)}...`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !description.trim()}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all',
                  submitting || !description.trim()
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600'
                )}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
