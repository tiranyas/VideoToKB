'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Check, Building2, FileText, Sparkles, ArrowRight, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/utils/cn';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
  icon: typeof Check;
}

export function OnboardingChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    (async () => {
      // Check if already dismissed
      if (localStorage.getItem('kbify-onboarding-dismissed')) {
        setDismissed(true);
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [
        { data: context },
        { data: articles },
      ] = await Promise.all([
        supabase.from('company_contexts').select('id').eq('user_id', user.id).maybeSingle(),
        supabase.from('articles').select('id').eq('user_id', user.id).limit(1),
      ]);

      const hasContext = !!context;
      const hasArticles = (articles?.length ?? 0) > 0;

      // If everything is done, auto-dismiss
      if (hasContext && hasArticles) {
        localStorage.setItem('kbify-onboarding-dismissed', 'true');
        setDismissed(true);
        setLoading(false);
        return;
      }

      setItems([
        {
          id: 'account',
          label: 'Create your account',
          description: 'Sign up and log in',
          href: '#',
          done: true, // Always true if they see this
          icon: Check,
        },
        {
          id: 'context',
          label: 'Add company context',
          description: 'Help the AI understand your product and audience',
          href: '/settings',
          done: hasContext,
          icon: Building2,
        },
        {
          id: 'article',
          label: 'Generate your first article',
          description: 'Paste a video URL or transcript below',
          href: '/',
          done: hasArticles,
          icon: FileText,
        },
      ]);
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDismiss() {
    localStorage.setItem('kbify-onboarding-dismissed', 'true');
    setDismissed(true);
  }

  if (loading || dismissed) return null;

  const completedCount = items.filter(i => i.done).length;
  const progress = Math.round((completedCount / items.length) * 100);

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 relative">
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 transition-colors"
          title="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Get started with KBify</h3>
            <p className="text-xs text-gray-400">{completedCount} of {items.length} steps completed</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 mb-5 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-600 to-blue-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-1">
          {items.map((item, i) => (
            <Link
              key={item.id}
              href={item.done ? '#' : item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all group',
                item.done
                  ? 'cursor-default'
                  : 'hover:bg-gray-50'
              )}
            >
              {/* Step indicator */}
              <div className={cn(
                'h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-all',
                item.done
                  ? 'bg-green-500'
                  : 'border-2 border-gray-200'
              )}>
                {item.done ? (
                  <Check className="h-3.5 w-3.5 text-white" />
                ) : (
                  <span className="text-xs font-medium text-gray-400">{i + 1}</span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm font-medium',
                  item.done ? 'text-gray-400 line-through' : 'text-gray-900'
                )}>
                  {item.label}
                </p>
                <p className="text-xs text-gray-400">{item.description}</p>
              </div>

              {/* Arrow for incomplete */}
              {!item.done && (
                <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
