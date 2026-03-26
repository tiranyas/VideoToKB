'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import {
  HelpCircle, X, ChevronDown, ChevronRight, Send, Loader2, Terminal,
  BookOpen, MessageSquarePlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import { useErrorCapture } from '@/hooks/use-error-capture';
import { getHelpArticle, type HelpArticle } from '@/lib/help-content';

type Tab = 'knowledge' | 'report';

const CATEGORIES = [
  { value: 'bug', label: 'Bug', emoji: '🐛' },
  { value: 'quality', label: 'Content Quality', emoji: '📝' },
  { value: 'styling', label: 'Styling Issue', emoji: '🎨' },
  { value: 'feature', label: 'Feature Request', emoji: '💡' },
  { value: 'other', label: 'Other', emoji: '💬' },
] as const;

export function HelpWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('knowledge');
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));
  const [article, setArticle] = useState<HelpArticle | null>(null);

  // Report form state
  const [category, setCategory] = useState<string>('bug');
  const [description, setDescription] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { getErrorLogs } = useErrorCapture();

  useEffect(() => {
    const found = getHelpArticle(pathname);
    setArticle(found);
    setExpandedSections(new Set([0]));
  }, [pathname]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const toggleSection = useCallback((index: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  async function handleSubmit() {
    if (!description.trim()) {
      toast.error('Please describe the issue');
      return;
    }
    setSubmitting(true);
    try {
      const errorLogs = category === 'bug' ? getErrorLogs() : undefined;
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
      toast.success('Thanks! Check your email for confirmation.');
      setDescription('');
      setExpectedBehavior('');
      setCategory('bug');
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpen(openTab?: Tab) {
    if (openTab) setTab(openTab);
    setOpen(true);
  }

  const hasKnowledge = !!article;

  return (
    <>
      {/* Floating Help label — left side, vertically centered */}
      <button
        onClick={() => handleOpen(hasKnowledge ? 'knowledge' : 'report')}
        className={cn(
          'fixed left-0 top-1/2 -translate-y-1/2 z-50 flex items-center gap-1.5',
          'rounded-r-xl px-3 py-2.5 text-sm font-medium shadow-lg transition-all hover:scale-105',
          'bg-violet-600 text-white hover:bg-violet-700 shadow-violet-600/25',
        )}
        aria-label="Help"
      >
        <HelpCircle className="h-4 w-4" />
        <span>Help</span>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel — slides from left */}
      <div
        className={cn(
          'fixed top-0 left-0 z-50 h-screen w-full sm:w-[400px] bg-white border-r border-gray-100 shadow-2xl transition-transform duration-300 ease-out flex flex-col',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header with tabs */}
        <div className="border-b border-gray-100">
          <div className="flex items-center justify-between px-5 pt-4 pb-0">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center">
                <HelpCircle className="h-4.5 w-4.5 text-violet-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Help</h2>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex px-5 mt-3 gap-1">
            {hasKnowledge && (
              <button
                onClick={() => setTab('knowledge')}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors',
                  tab === 'knowledge'
                    ? 'border-violet-600 text-violet-700 bg-violet-50/50'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                )}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Knowledge
              </button>
            )}
            <button
              onClick={() => setTab('report')}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors',
                tab === 'report'
                  ? 'border-violet-600 text-violet-700 bg-violet-50/50'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              )}
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              Report an Issue
            </button>
          </div>
        </div>

        {/* Tab content */}
        {tab === 'knowledge' && article ? (
          <>
            {/* Knowledge content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">{article.title}</h3>
              {article.sections.map((section, i) => (
                <div key={i} className="border-b border-gray-50 last:border-0">
                  <button
                    onClick={() => toggleSection(i)}
                    className="flex items-center gap-2 w-full py-3.5 text-left group"
                  >
                    {expandedSections.has(i) ? (
                      <ChevronDown className="h-4 w-4 text-violet-500 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 shrink-0" />
                    )}
                    <span
                      className={cn(
                        'text-sm font-medium transition-colors',
                        expandedSections.has(i) ? 'text-violet-700' : 'text-gray-700 group-hover:text-gray-900'
                      )}
                    >
                      {section.heading}
                    </span>
                  </button>
                  {expandedSections.has(i) && (
                    <div className="pl-6 pb-4">
                      <p className="text-sm text-gray-500 leading-relaxed">{section.content}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400 text-center">
                Need more help?{' '}
                <button
                  onClick={() => setTab('report')}
                  className="text-violet-500 hover:text-violet-600 transition-colors underline underline-offset-2"
                >
                  Report an issue
                </button>
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Report form */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
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
                />
              </div>

              {/* Expected behavior */}
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
            </div>

            {/* Submit footer */}
            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4 bg-gray-50/50">
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
          </>
        )}
      </div>
    </>
  );
}
