'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Sparkles, Zap, Users, Building2, Check, ArrowLeft, ExternalLink, CreditCard, FileText, X } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import type { UserUsage, Subscription } from '@/types';

interface PlanInfo {
  id: string;
  name: string;
  priceCents: number;
  articleLimit: number;
  description: string;
}

interface Invoice {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  tax: number;
  currency: string;
  billingReason: string;
  cardBrand: string | null;
  cardLastFour: string | null;
  invoiceUrl: string | null;
  createdAt: string;
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
    { text: 'Priority email support', included: true },
  ],
};

const PLAN_ARTICLES: Record<string, string> = {
  free: '3 articles / month',
  starter: '30 articles / month',
  team: '30 articles / seat (shared pool)',
  enterprise: '300 articles / month',
};

// Monthly prices in cents for display (annual prices derived)
const PLAN_PRICES: Record<string, { monthly: number; annual: number }> = {
  free: { monthly: 0, annual: 0 },
  starter: { monthly: 2999, annual: 2499 },
  team: { monthly: 3499, annual: 2899 },
  enterprise: { monthly: 29999, annual: 24999 },
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-green-50 text-green-700' },
  trialing: { label: 'Trial', className: 'bg-blue-50 text-blue-700' },
  canceled: { label: 'Canceled', className: 'bg-amber-50 text-amber-700' },
  past_due: { label: 'Past Due', className: 'bg-red-50 text-red-700' },
  paused: { label: 'Paused', className: 'bg-gray-50 text-gray-700' },
  expired: { label: 'Expired', className: 'bg-gray-50 text-gray-500' },
  unpaid: { label: 'Unpaid', className: 'bg-red-50 text-red-700' },
};

export default function BillingPage() {
  const supabase = createClient();
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [annual, setAnnual] = useState(false);
  const [changePlanTarget, setChangePlanTarget] = useState<{ planId: string; name: string } | null>(null);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load usage
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

    // Load subscription details
    const { data: subData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (subData) {
      setSubscription({
        id: subData.id,
        userId: subData.user_id,
        planId: subData.plan_id,
        status: subData.status,
        bonusCredits: subData.bonus_credits,
        currentPeriodStart: subData.current_period_start,
        currentPeriodEnd: subData.current_period_end,
        lsSubscriptionId: subData.ls_subscription_id ?? undefined,
        lsCustomerId: subData.ls_customer_id ?? undefined,
        lsVariantId: subData.ls_variant_id ?? undefined,
        billingInterval: subData.billing_interval ?? undefined,
        customerPortalUrl: subData.customer_portal_url ?? undefined,
        createdAt: subData.created_at,
        updatedAt: subData.updated_at,
      });
      if (subData.billing_interval === 'yearly') setAnnual(true);
    }

    // Load plans
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load invoices separately (non-blocking)
  useEffect(() => {
    fetch('/api/billing/invoices')
      .then((r) => r.json())
      .then((d) => { if (d.invoices) setInvoices(d.invoices); })
      .catch(() => {});
  }, []);

  const handleCheckout = useCallback(async (planId: string, isArticlePack = false) => {
    setCheckoutLoading(isArticlePack ? 'article-pack' : planId);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          interval: annual ? 'yearly' : 'monthly',
          isArticlePack,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (window.LemonSqueezy) {
        window.LemonSqueezy.Url.Open(data.checkoutUrl);
      } else {
        window.open(data.checkoutUrl, '_blank');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start checkout');
    } finally {
      setCheckoutLoading(null);
    }
  }, [annual]);

  const handleCancel = useCallback(async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You\'ll keep access until the end of your billing period.')) return;
    setActionLoading('cancel');
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Subscription canceled. You\'ll keep access until the end of your billing period.');
      // Reload data after a brief delay (webhook needs time to update DB)
      setTimeout(() => loadData(), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setActionLoading(null);
    }
  }, [loadData]);

  const handleResume = useCallback(async () => {
    setActionLoading('resume');
    try {
      const res = await fetch('/api/billing/resume', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Subscription resumed!');
      setTimeout(() => loadData(), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resume subscription');
    } finally {
      setActionLoading(null);
    }
  }, [loadData]);

  const handleChangePlan = useCallback(async (planId: string) => {
    setActionLoading('change-plan');
    try {
      const res = await fetch('/api/billing/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, interval: annual ? 'yearly' : 'monthly' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Plan changed! Your billing will be adjusted automatically.');
      setChangePlanTarget(null);
      setTimeout(() => loadData(), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change plan');
    } finally {
      setActionLoading(null);
    }
  }, [annual, loadData]);

  const handleUpdatePaymentMethod = useCallback(async () => {
    setActionLoading('payment');
    try {
      const res = await fetch('/api/billing/payment-method');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.open(data.url, '_blank');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to get payment update link');
    } finally {
      setActionLoading(null);
    }
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
  const hasActiveSub = subscription?.lsSubscriptionId && subscription.status !== 'expired';
  const isCanceled = subscription?.status === 'canceled';
  const canResume = isCanceled && subscription?.currentPeriodEnd && new Date(subscription.currentPeriodEnd) > new Date();

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Billing & Plan</h1>
          {subscription && subscription.status !== 'active' && subscription.planId !== 'free' && (
            <span className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              STATUS_BADGES[subscription.status]?.className ?? 'bg-gray-50 text-gray-500'
            )}>
              {STATUS_BADGES[subscription.status]?.label ?? subscription.status}
            </span>
          )}
        </div>
        <p className="text-gray-500 mt-1">Manage your subscription, billing, and usage</p>
      </div>

      {/* Subscription Management Bar */}
      {hasActiveSub && (
        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="font-medium text-gray-900">
                {usage?.planName} Plan
                {subscription?.billingInterval === 'yearly' ? ' (Annual)' : ' (Monthly)'}
              </p>
              <p className="text-sm text-gray-500">
                {isCanceled
                  ? `Access until ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                  : `Renews ${new Date(subscription!.currentPeriodEnd).toLocaleDateString()}`
                }
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Update Payment Method */}
              <button
                onClick={handleUpdatePaymentMethod}
                disabled={actionLoading === 'payment'}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <CreditCard className="h-3.5 w-3.5" />
                {actionLoading === 'payment' ? 'Loading...' : 'Update Payment'}
              </button>

              {/* Cancel / Resume */}
              {canResume ? (
                <button
                  onClick={handleResume}
                  disabled={actionLoading === 'resume'}
                  className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-50"
                >
                  {actionLoading === 'resume' ? 'Resuming...' : 'Resume Subscription'}
                </button>
              ) : !isCanceled ? (
                <button
                  onClick={handleCancel}
                  disabled={actionLoading === 'cancel'}
                  className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {actionLoading === 'cancel' ? 'Canceling...' : 'Cancel Subscription'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

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

      {/* Billing Toggle */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Plans</h2>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${!annual ? 'text-gray-900' : 'text-gray-400'}`}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-14 h-7 rounded-full transition-colors ${annual ? 'bg-violet-600' : 'bg-gray-300'}`}
            aria-label="Toggle annual billing"
          >
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${annual ? 'translate-x-7' : 'translate-x-0'}`} />
          </button>
          <span className={`text-sm font-medium ${annual ? 'text-gray-900' : 'text-gray-400'}`}>Annual</span>
          {annual && (
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Save up to 17%</span>
          )}
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const Icon = PLAN_ICONS[plan.id] ?? Sparkles;
          const colors = PLAN_COLORS[plan.id] ?? PLAN_COLORS.free;
          const isCurrent = usage?.planId === plan.id;
          const features = PLAN_FEATURES[plan.id] ?? [];
          const articlesLabel = PLAN_ARTICLES[plan.id] ?? `${plan.articleLimit} articles / month`;
          const isHighlighted = plan.id === 'starter';
          const isTeam = plan.id === 'team';
          const prices = PLAN_PRICES[plan.id];
          const displayPrice = prices ? (annual ? prices.annual : prices.monthly) : plan.priceCents;
          const isFree = plan.priceCents === 0;
          const canChangeTo = hasActiveSub && !isCurrent && !isFree && subscription?.status === 'active';

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
                  {isFree ? '$0' : `$${(displayPrice / 100).toFixed(2)}`}
                </span>
                {!isFree && (
                  <span className="text-gray-400 text-sm">{isTeam ? '/seat/mo' : '/mo'}</span>
                )}
              </div>

              {isTeam && (
                <p className="text-xs text-gray-400 mb-2">
                  Min 3 seats = ${((displayPrice / 100) * 3).toFixed(2)}/mo
                </p>
              )}

              {!annual && !isFree && prices && prices.annual < prices.monthly && (
                <p className="text-xs text-violet-500 mb-2">
                  ${(prices.annual / 100).toFixed(2)}/mo billed annually
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
                      <span className="h-4 w-4 flex items-center justify-center mt-0.5 shrink-0 text-gray-300">&#10005;</span>
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
              ) : canChangeTo ? (
                <button
                  onClick={() => setChangePlanTarget({ planId: plan.id, name: plan.name })}
                  className={cn(
                    'w-full rounded-xl py-2.5 text-sm font-medium text-center transition-all',
                    isHighlighted
                      ? 'bg-gradient-to-r from-violet-600 to-blue-500 text-white hover:from-violet-700 hover:to-blue-600 shadow-sm'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  )}
                >
                  Switch to {plan.name}
                </button>
              ) : isFree ? (
                <button
                  disabled
                  className="w-full rounded-xl py-2.5 text-sm font-medium border border-gray-200 text-gray-400 cursor-not-allowed"
                >
                  Free
                </button>
              ) : (
                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={checkoutLoading === plan.id}
                  className={cn(
                    'w-full rounded-xl py-2.5 text-sm font-medium text-center transition-all',
                    checkoutLoading === plan.id && 'opacity-60 cursor-wait',
                    isHighlighted
                      ? 'bg-gradient-to-r from-violet-600 to-blue-500 text-white hover:from-violet-700 hover:to-blue-600 shadow-sm'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  )}
                >
                  {checkoutLoading === plan.id ? 'Loading...' : 'Upgrade'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Article Pack Add-on */}
      <div className="mt-8 max-w-md mx-auto">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Need more articles?</h3>
            <p className="text-sm text-gray-500 mt-1">Add 10 extra articles to any paid plan</p>
          </div>
          <button
            onClick={() => handleCheckout('', true)}
            disabled={checkoutLoading === 'article-pack' || usage?.planId === 'free'}
            className={cn(
              'rounded-xl px-5 py-2.5 text-sm font-medium transition-all',
              usage?.planId === 'free'
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-violet-600 text-white hover:bg-violet-700',
              checkoutLoading === 'article-pack' && 'opacity-60 cursor-wait'
            )}
          >
            {checkoutLoading === 'article-pack' ? 'Loading...' : '$9.99'}
          </button>
        </div>
      </div>

      {/* Invoices */}
      {invoices.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoices</h2>
          <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-5 py-3 font-medium text-gray-500">Date</th>
                  <th className="px-5 py-3 font-medium text-gray-500">Amount</th>
                  <th className="px-5 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-5 py-3 font-medium text-gray-500">Payment</th>
                  <th className="px-5 py-3 font-medium text-gray-500 text-right">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 text-gray-900">
                      {new Date(inv.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3 text-gray-900 font-medium">
                      ${(inv.total / 100).toFixed(2)} {inv.currency.toUpperCase()}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded-full',
                        inv.status === 'paid' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                      )}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {inv.cardBrand && inv.cardLastFour
                        ? `${inv.cardBrand} ****${inv.cardLastFour}`
                        : '—'
                      }
                    </td>
                    <td className="px-5 py-3 text-right">
                      {inv.invoiceUrl ? (
                        <a
                          href={inv.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-violet-600 hover:text-violet-700 transition-colors"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          PDF
                        </a>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="text-center text-xs text-gray-400 mt-8">
        Questions about billing?{' '}
        <a href="mailto:support@kbpipe.io" className="text-violet-500 hover:text-violet-600 transition-colors">
          Contact us
        </a>
      </p>

      {/* Change Plan Confirmation Dialog */}
      {changePlanTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Change Plan</h3>
              <button onClick={() => setChangePlanTarget(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Switch from <strong>{usage?.planName}</strong> to <strong>{changePlanTarget.name}</strong> ({annual ? 'annual' : 'monthly'})?
            </p>
            <p className="text-xs text-gray-400 mb-6">
              Your billing will be prorated automatically. The price difference is calculated based on time remaining in your current period.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setChangePlanTarget(null)}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleChangePlan(changePlanTarget.planId)}
                disabled={actionLoading === 'change-plan'}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'change-plan' ? 'Switching...' : 'Confirm Switch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
