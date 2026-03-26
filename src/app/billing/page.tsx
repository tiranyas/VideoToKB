'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Sparkles, Zap, Crown, Check, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/utils/cn';
import type { UserUsage } from '@/types';

interface PlanInfo {
  id: string;
  name: string;
  priceCents: number;
  articleLimit: number;
  description: string;
}

const PLAN_ICONS: Record<string, typeof Sparkles> = {
  free: Sparkles,
  pro: Zap,
  business: Crown,
};

const PLAN_FEATURES: Record<string, string[]> = {
  free: [
    '3 articles per month',
    'All platforms supported',
    'YouTube, Loom, Google Drive',
    'Community support',
  ],
  pro: [
    '50 articles per month',
    'All platforms supported',
    'YouTube, Loom, Google Drive',
    'Priority support',
    'Custom company context',
    'API access',
  ],
  business: [
    '200 articles per month',
    'All platforms supported',
    'YouTube, Loom, Google Drive',
    'Dedicated support',
    'Custom company context',
    'API access',
    'Multiple workspaces',
    'Team collaboration',
  ],
};

export default function BillingPage() {
  const supabase = createClient();
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch usage
      const { data: usageData } = await supabase.rpc('get_user_usage', { p_user_id: user.id });
      const row = Array.isArray(usageData) ? usageData[0] : usageData;
      if (row) {
        setUsage({
          articlesThisPeriod: row.articles_this_period,
          articleLimit: row.article_limit,
          bonusCredits: row.bonus_credits,
          articlesRemaining: row.articles_remaining,
          planId: row.plan_id,
          planName: row.plan_name,
          periodStart: row.period_start,
          periodEnd: row.period_end,
        });
      }

      // Fetch plans
      const { data: plansData } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (plansData) {
        setPlans(plansData.map((p) => ({
          id: p.id,
          name: p.name,
          priceCents: p.price_cents,
          articleLimit: p.article_limit,
          description: p.description,
        })));
      }

      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
      </div>
    );
  }

  const totalLimit = usage ? usage.articleLimit + usage.bonusCredits : 0;
  const usagePercent = usage ? Math.min(100, (usage.articlesThisPeriod / Math.max(1, totalLimit)) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Plan</h1>
        <p className="text-gray-500 mt-1">Manage your subscription and usage</p>
      </div>

      {/* Current Usage */}
      {usage && (
        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Current Usage</h2>
            <span className="text-sm text-gray-400">
              Resets {new Date(usage.periodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <div className="flex items-end gap-2 mb-3">
            <span className="text-4xl font-bold text-gray-900">{usage.articlesThisPeriod}</span>
            <span className="text-lg text-gray-400 mb-1">/ {totalLimit} articles</span>
          </div>

          <div className="h-3 rounded-full bg-gray-100 overflow-hidden mb-2">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                usage.articlesRemaining <= 0 ? 'bg-red-500' : usage.articlesRemaining <= 2 ? 'bg-amber-500' : 'bg-violet-500'
              )}
              style={{ width: `${usagePercent}%` }}
            />
          </div>

          <p className={cn(
            'text-sm',
            usage.articlesRemaining <= 0 ? 'text-red-500 font-medium' : 'text-gray-500'
          )}>
            {usage.articlesRemaining <= 0
              ? 'You\'ve reached your article limit. Upgrade to keep generating.'
              : `${usage.articlesRemaining} article${usage.articlesRemaining === 1 ? '' : 's'} remaining`
            }
          </p>
        </div>
      )}

      {/* Plans */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Plans</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const Icon = PLAN_ICONS[plan.id] ?? Sparkles;
          const isCurrent = usage?.planId === plan.id;
          const features = PLAN_FEATURES[plan.id] ?? [];

          return (
            <div
              key={plan.id}
              className={cn(
                'relative rounded-2xl border-2 p-6 transition-all',
                isCurrent
                  ? 'border-violet-500 bg-violet-50/30 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              )}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-3 py-0.5 text-[11px] font-semibold text-white uppercase tracking-wide">
                  Current Plan
                </div>
              )}

              <div className="flex items-center gap-2 mb-3">
                <div className={cn(
                  'h-10 w-10 rounded-xl flex items-center justify-center',
                  plan.id === 'free' ? 'bg-gray-100' : plan.id === 'pro' ? 'bg-violet-100' : 'bg-amber-100'
                )}>
                  <Icon className={cn(
                    'h-5 w-5',
                    plan.id === 'free' ? 'text-gray-500' : plan.id === 'pro' ? 'text-violet-600' : 'text-amber-600'
                  )} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
              </div>

              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">
                  ${(plan.priceCents / 100).toFixed(0)}
                </span>
                <span className="text-gray-400 text-sm">/month</span>
              </div>

              <p className="text-sm text-gray-500 mb-5">{plan.description}</p>

              <ul className="space-y-2.5 mb-6">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button
                  disabled
                  className="w-full rounded-xl py-2.5 text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : (
                <a
                  href="mailto:support@kbpipe.io?subject=Upgrade to ${plan.name} plan"
                  className={cn(
                    'block w-full rounded-xl py-2.5 text-sm font-medium text-center transition-all',
                    plan.id === 'pro'
                      ? 'bg-violet-600 text-white hover:bg-violet-700'
                      : plan.id === 'business'
                      ? 'bg-gray-900 text-white hover:bg-gray-800'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {plan.priceCents > (usage?.planId === 'free' ? 0 : 999999) ? 'Upgrade' : 'Contact Sales'}
                </a>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-gray-400 mt-8">
        Need a custom plan or have questions? Contact us at{' '}
        <a href="mailto:support@kbpipe.io" className="text-violet-500 hover:text-violet-600 transition-colors">
          support@kbpipe.io
        </a>
      </p>
    </div>
  );
}
