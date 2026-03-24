'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ScrollReveal, StaggerReveal } from '@/components/scroll-reveal';

const Check = () => (
  <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const Cross = () => (
  <svg className="w-5 h-5 text-gray-300 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

interface Plan {
  name: string;
  description: string;
  monthlyPrice: number | string;
  annualPrice: number | string;
  priceLabel?: string;
  articles: string;
  features: { text: string; included: boolean }[];
  cta: string;
  highlighted?: boolean;
  badge?: string;
}

const plans: Plan[] = [
  {
    name: 'Free',
    description: 'Perfect to try KBPipe',
    monthlyPrice: 0,
    annualPrice: 0,
    articles: '3 articles / month',
    features: [
      { text: 'All input sources', included: true },
      { text: '1 workspace', included: true },
      { text: 'Export: Markdown, HTML, Word', included: true },
      { text: 'Generic platform profile', included: true },
      { text: 'Branding & style import', included: false },
      { text: 'API & MCP access', included: false },
    ],
    cta: 'Get Started',
  },
  {
    name: 'Starter',
    description: 'For creators and solo teams',
    monthlyPrice: 29,
    annualPrice: 25,
    articles: '30 articles / month',
    highlighted: true,
    badge: 'Most Popular',
    features: [
      { text: 'All input sources', included: true },
      { text: '3 workspaces', included: true },
      { text: 'Export: Markdown, HTML, Word', included: true },
      { text: 'All platform profiles', included: true },
      { text: 'Branding & style import', included: true },
      { text: 'API & MCP access', included: true },
      { text: 'Custom article types', included: true },
    ],
    cta: 'Start Free Trial',
  },
  {
    name: 'Team',
    description: 'Centralized billing, shared workspace',
    monthlyPrice: 35,
    annualPrice: 29,
    priceLabel: '/seat/mo',
    articles: '30 articles / seat (shared pool)',
    features: [
      { text: 'Everything in Starter, plus:', included: true },
      { text: 'Min 3 seats, add more anytime', included: true },
      { text: 'Unlimited workspaces', included: true },
      { text: 'Centralized billing', included: true },
      { text: 'Shared article pool across team', included: true },
      { text: 'Team activity log', included: true },
      { text: 'Role-based access (Admin / Editor / Viewer)', included: true },
      { text: 'Priority support', included: true },
    ],
    cta: 'Contact Us',
  },
  {
    name: 'Enterprise',
    description: 'For organizations with custom needs',
    monthlyPrice: 'Custom',
    annualPrice: 'Custom',
    articles: 'Unlimited articles',
    features: [
      { text: 'Everything in Team, plus:', included: true },
      { text: 'Unlimited seats', included: true },
      { text: 'Custom integrations', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: 'SLA & uptime guarantee', included: true },
      { text: 'DPA & compliance support', included: true },
      { text: 'SSO / SAML', included: true },
      { text: 'On-call support', included: true },
    ],
    cta: 'Contact Us',
  },
];

export function PricingSection() {
  const [annual, setAnnual] = useState(true);

  return (
    <section id="pricing" className="py-20 px-6 bg-gray-50/70">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal>
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-center text-gray-500 mb-10 max-w-lg mx-auto">
            Start free. Upgrade when you need more.
          </p>
        </ScrollReveal>

        {/* Billing toggle */}
        <ScrollReveal delay={100}>
          <div className="flex items-center justify-center gap-3 mb-12">
            <span className={`text-sm font-medium ${!annual ? 'text-gray-900' : 'text-gray-400'}`}>
              Monthly
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                annual ? 'bg-violet-600' : 'bg-gray-300'
              }`}
              aria-label="Toggle annual billing"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${
                  annual ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${annual ? 'text-gray-900' : 'text-gray-400'}`}>
              Annual
            </span>
            {annual && (
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                Save up to 17%
              </span>
            )}
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          <StaggerReveal staggerMs={100} distance={30}>
            {plans.map((plan) => {
              const price = annual ? plan.annualPrice : plan.monthlyPrice;
              const label = plan.priceLabel ?? '/mo';
              const isTeam = plan.name === 'Team';

              return (
                <div
                  key={plan.name}
                  className={`bg-white rounded-2xl p-6 flex flex-col relative transition-all ${
                    plan.highlighted
                      ? 'border-2 border-violet-500 shadow-lg shadow-violet-500/10'
                      : 'border border-gray-100 hover:border-violet-200 hover:shadow-md'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                      {plan.badge}
                    </div>
                  )}

                  <div className="mb-5">
                    <h3 className="font-semibold text-gray-900 text-lg">{plan.name}</h3>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-gray-900">
                        {typeof price === 'number' ? `$${price}` : price}
                      </span>
                      {typeof price === 'number' && price > 0 && (
                        <span className="text-sm text-gray-400">{label}</span>
                      )}
                    </div>
                    {isTeam && (
                      <p className="mt-1 text-xs text-gray-400">
                        Min 3 seats = ${(typeof price === 'number' ? price : 0) * 3}/mo
                      </p>
                    )}
                    {!annual && typeof plan.annualPrice === 'number' && plan.annualPrice !== plan.monthlyPrice && !isTeam && (
                      <p className="mt-1 text-xs text-violet-500">
                        ${plan.annualPrice}/mo billed annually
                      </p>
                    )}
                    <p className="mt-2 text-sm text-gray-500">{plan.description}</p>
                  </div>

                  <div className="mb-4 py-2 px-3 bg-violet-50 rounded-lg">
                    <p className="text-sm font-medium text-violet-700">{plan.articles}</p>
                  </div>

                  <ul className="space-y-2.5 text-sm text-gray-600 mb-7 flex-1">
                    {plan.features.map((f) => (
                      <li key={f.text} className="flex items-start gap-2">
                        {f.included ? <Check /> : <Cross />}
                        <span className={f.included ? '' : 'text-gray-400'}>{f.text}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.name === 'Team' || plan.name === 'Enterprise' ? 'mailto:support@kbpipe.io?subject=KBPipe ' + plan.name + ' Plan' : '/login?signup=true'}
                    className={`w-full text-center rounded-xl px-6 py-3 text-sm font-medium transition-all ${
                      plan.highlighted
                        ? 'bg-gradient-to-r from-violet-600 to-blue-500 text-white hover:from-violet-700 hover:to-blue-600 shadow-sm'
                        : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              );
            })}
          </StaggerReveal>
        </div>

        {/* Add-on */}
        <ScrollReveal delay={300}>
          <div className="mt-12 max-w-md mx-auto">
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
        </ScrollReveal>

        {/* FAQ-style note */}
        <ScrollReveal delay={400}>
          <p className="text-center text-sm text-gray-400 mt-10">
            All plans include a 7-day free trial. No credit card required to start.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
