'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Sparkles, Zap, Users, Building2, Check, ArrowLeft } from 'lucide-react';
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
  starter: Zap,
  team: Users,
  enterprise: Building2,
};

const PLAN_COLORS: Record<string, { bg: string; text: string; iconBg: string }> = {
  free: { bg: 'bg-gray-100', text: 'text-gray-500', iconBg: 'bg-gray-100' },
  starter: { bg: 'bg-violet-100', text: 'text-violet-600', iconBg: 'bg-violet-100' },
  team: { bg: 'bg-blue-100', text: 'text-blue-600', iconBg: 'bg-blue-100' },
  enterprise: { bg: 'bg-amber-100', text: 'text-amber-600', iconBg: 'bg-amber-100' },
};

const PLAN_FEATURES: Record<string, { text: string; included: boolean }[]> = {
  free: [
    { text: 'All input sources', included: true },
    { text: '1 workspace', included: true },
    { text: 'Export: Markdown, HTML, Word', included: true },
    { text: 'Generic platform profile', included: true },
    { text: 'Branding & style import', included: false },
    { text: 'API & MCP access', included: false },
  ],
  starter: [
    { text: 'All input sources', included: true },
    { text: '3 workspaces', included: true },
    { text: 'Export: Markdown, HTML, Word', included: true },
    { text: 'All platform profiles', included: true },
    { text: 'Branding & style import', included: true },
    { text: 'API & MCP access', included: true },
    { text: 'Custom article types', included: true },
  ],
  team: [
    { text: 'Everything in Starter, plus:', included: true },
    { text: 'Min 3 seats, add more anytime', included: true },
    { text: 'Unlimited workspaces', included: true },
    { text: 'Centralized billing', included: true },
    { text: 'Shared article pool across team', included: true },
    { text: 'Team activity log', included: true },
    { text: 'Role-based access', included: true },
    { text: 'Priority support', included: true },
  ],
  enterprise: [
    { text: 'Everything in Team, plus:', included: true },
    { text: 'Unlimited seats', included: true },
    { text: 'Custom integrations', included: true },
    { text: 'Dedicated account manager', included: true },
    { text: 'SLA & uptime guarantee', included: true },
    { text: 'DPA & compliance support', included: true },
    { text: 'SSO / SAML', included: true },
    { text: 'On-call support', included: true },
  ],
};

const PLAN_ARTICLES: Record<string, string> = {
  free: '3 articles / month',
  starter: '30 articles / month',
  team: '30 articles / seat (shared pool)',
  enterprise: '500 articles / month',
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
    <div className="max-w-5xl mx-auto px-6 py-10">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const Icon = PLAN_ICONS[plan.id] ?? Sparkles;
          const colors = PLAN_COLORS[plan.id] ?? PLAN_COLORS.free;
          const isCurrent = usage?.planId === plan.id;
          const features = PLAN_FEATURES[plan.id] ?? [];
          const articlesLabel = PLAN_ARTICLES[plan.id] ?? `${plan.articleLimit} articles / month`;
          const isHighlighted = plan.id === 'starter';
          const isEnterprise = plan.id === 'enterprise';
          const isTeam = plan.id === 'team';

          return (
            <div
              key={plan.id}
              className={cn(
                'relative rounded-2xl p-6 flex flex-col transition-all',
                isCurrent
                  ? 'border-2 border-violet-500 bg-violet-50/30 shadow-md'
                  : isHighlighted
                  ? 'border-2 border-violet-500 bg-white shadow-lg shadow-violet-500/10'
                  : 'border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              )}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-3 py-0.5 text-[11px] font-semibold text-white uppercase tracking-wide whitespace-nowrap">
                  Current Plan
                </div>
              )}
              {isHighlighted && !isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-3 py-0.5 text-[11px] font-semibold text-white uppercase tracking-wide whitespace-nowrap">
                  Most Popular
                </div>
              )}

              <div className="flex items-center gap-2 mb-3">
                <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', colors.iconBg)}>
                  <Icon className={cn('h-5 w-5', colors.text)} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
              </div>

              <div className="mb-1">
                <span className="text-3xl font-bold text-gray-900">
                  {isEnterprise ? 'Custom' : `$${(plan.priceCents / 100).toFixed(0)}`}
                </span>
                {!isEnterprise && plan.priceCents > 0 && (
                  <span className="text-gray-400 text-sm">{isTeam ? '/seat/mo' : '/mo'}</span>
                )}
              </div>

              {isTeam && (
                <p className="text-xs text-gray-400 mb-2">
                  Min 3 seats = ${((plan.priceCents / 100) * 3).toFixed(0)}/mo
                </p>
              )}

              <p className="text-sm text-gray-500 mb-4">{plan.description}</p>

              <div className="mb-4 py-2 px-3 bg-violet-50 rounded-lg">
                <p className="text-sm font-medium text-violet-700">{articlesLabel}</p>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {features.map((f) => (
                  <li key={f.text} className="flex items-start gap-2 text-sm">
                    {f.included ? (
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    ) : (
                      <span className="h-4 w-4 flex items-center justify-center mt-0.5 shrink-0 text-gray-300">✕</span>
                    )}
                    <span className={f.included ? 'text-gray-600' : 'text-gray-400'}>{f.text}</span>
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
                  href={`mailto:support@kbpipe.io?subject=Upgrade to ${plan.name} plan`}
                  className={cn(
                    'block w-full rounded-xl py-2.5 text-sm font-medium text-center transition-all',
                    isHighlighted
                      ? 'bg-gradient-to-r from-violet-600 to-blue-500 text-white hover:from-violet-700 hover:to-blue-600 shadow-sm'
                      : isEnterprise || isTeam
                      ? 'bg-gray-900 text-white hover:bg-gray-800'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {isEnterprise || isTeam ? 'Contact Us' : plan.priceCents === 0 ? 'Current' : 'Upgrade'}
                </a>
              )}
            </div>
          );
        })}
      </div>

      {/* Add-on */}
      <div className="mt-8 max-w-md mx-auto">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Need more articles?</h3>
            <p className="text-sm text-gray-500 mt-1">Add 10 extra articles to any paid plan</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-gray-900">$10</span>
            <p className="text-xs text-gray-400">per 10 articles</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-gray-400 mt-8">
        All plans include a 7-day free trial. No credit card required.{' '}
        <a href="mailto:support@kbpipe.io" className="text-violet-500 hover:text-violet-600 transition-colors">
          Contact us
        </a>{' '}
        for custom needs.
      </p>
    </div>
  );
}
