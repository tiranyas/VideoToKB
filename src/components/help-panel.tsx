'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { HelpCircle, X, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { getHelpArticle, type HelpArticle } from '@/lib/help-content';

export function HelpPanel() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));
  const [article, setArticle] = useState<HelpArticle | null>(null);

  useEffect(() => {
    const found = getHelpArticle(pathname);
    setArticle(found);
    // Reset expanded sections when page changes
    setExpandedSections(new Set([0]));
  }, [pathname]);

  // Close on Escape
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

  if (!article) return null;

  return (
    <>
      {/* Floating help button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed bottom-6 right-6 z-40 h-11 w-11 rounded-full flex items-center justify-center shadow-lg transition-all duration-200',
          open
            ? 'bg-gray-800 text-white scale-90'
            : 'bg-gradient-to-r from-violet-600 to-blue-500 text-white hover:from-violet-700 hover:to-blue-600 hover:scale-105'
        )}
        title="Help"
      >
        {open ? <X className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px] lg:bg-transparent lg:backdrop-blur-none"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          'fixed top-0 right-0 z-50 h-screen w-full sm:w-[380px] bg-white border-l border-gray-100 shadow-2xl transition-transform duration-300 ease-out flex flex-col',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <HelpCircle className="h-4.5 w-4.5 text-violet-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{article.title}</h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
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
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <p className="text-xs text-gray-400 text-center">
            Need more help?{' '}
            <a href="mailto:support@kbify.com" className="text-violet-500 hover:text-violet-600 transition-colors">
              Contact support
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
