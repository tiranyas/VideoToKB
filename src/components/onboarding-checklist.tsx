'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Check, Building2, Palette, Layout, FileCode, Sparkles, ArrowRight, X } from 'lucide-react';
import { useWorkspace } from '@/contexts/workspace-context';
import { cn } from '@/utils/cn';
import type { OnboardingState } from '@/types';

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

  const { activeWorkspace } = useWorkspace();

  useEffect(() => {
    // Check if already dismissed
    if (localStorage.getItem('kbpipe-onboarding-dismissed')) {
      setDismissed(true);
      setLoading(false);
      return;
    }

    if (!activeWorkspace) { setLoading(false); return; }

    const onboarding: OnboardingState | undefined = activeWorkspace.onboardingState;

    // If onboarding is fully completed, auto-dismiss
    if (onboarding?.completed) {
      localStorage.setItem('kbpipe-onboarding-dismissed', 'true');
      setDismissed(true);
      setLoading(false);
      return;
    }

    const steps = onboarding?.steps;

    setItems([
      {
        id: 'workspace',
        label: 'Set up workspace',
        description: 'Name your workspace and configure basics',
        href: '/onboarding',
        done: !!steps?.workspace,
        icon: Building2,
      },
      {
        id: 'brand',
        label: 'Configure branding',
        description: 'Extract brand colors from your website',
        href: '/onboarding',
        done: !!steps?.brand,
        icon: Palette,
      },
      {
        id: 'platform',
        label: 'Select KB platform',
        description: 'Choose your knowledge base platform',
        href: '/onboarding',
        done: !!steps?.platform,
        icon: Layout,
      },
      {
        id: 'template',
        label: 'Import template',
        description: 'Optionally import a custom article template',
        href: '/onboarding',
        done: !!steps?.template,
        icon: FileCode,
      },
    ]);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id, activeWorkspace?.onboardingState?.completed]);

  function handleDismiss() {
    localStorage.setItem('kbpipe-onboarding-dismissed', 'true');
    setDismissed(true);
  }

  if (loading || dismissed) return null;

  const completedCount = items.filter(i => i.done).length;
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  // All steps done but not formally completed — hide checklist
  if (completedCount === items.length && items.length > 0) return null;

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
            <h3 className="text-sm font-semibold text-gray-900">Get started with KBPipe</h3>
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

        {/* Complete setup link */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Complete setup
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
