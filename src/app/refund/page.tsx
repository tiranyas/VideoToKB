import Link from 'next/link';
import { RefreshCw, CreditCard, Clock, AlertCircle, Mail, HelpCircle } from 'lucide-react';

export const metadata = {
  title: 'Refund Policy - KBPipe',
  description: 'KBPipe refund and cancellation policy.',
};

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100">
          <Icon className="h-4.5 w-4.5 text-gray-600" />
        </div>
        <h2 className="text-lg font-semibold tracking-tight text-gray-900">{title}</h2>
      </div>
      <div className="pl-12 space-y-2 text-sm leading-relaxed text-gray-600">{children}</div>
    </section>
  );
}

export default function RefundPage() {
  return (
    <div className="flex min-h-screen items-start justify-center bg-gray-50/50 px-4 py-16">
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl bg-white shadow-xl shadow-gray-200/50 p-8 sm:p-10 space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Refund Policy</h1>
            <p className="text-sm text-gray-400">Last updated: March 27, 2026</p>
          </div>

          <div className="border-t border-gray-100" />

          <p className="text-sm leading-relaxed text-gray-600">
            We want you to be satisfied with KBPipe. This policy outlines how refunds and cancellations work.
          </p>

          {/* Free Trial */}
          <Section icon={Clock} title="Free Trial">
            <p>
              All paid plans include a <strong>7-day free trial</strong>. No credit card is required to start.
              During the trial, you have full access to all features of the selected plan.
            </p>
            <p>
              If the service doesn&apos;t meet your needs, simply cancel before the trial ends and you
              won&apos;t be charged.
            </p>
          </Section>

          {/* Subscription Cancellation */}
          <Section icon={CreditCard} title="Subscription Cancellation">
            <p>
              You can cancel your subscription at any time. Upon cancellation:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your subscription remains active until the end of the current billing period</li>
              <li>You retain access to all features until your plan expires</li>
              <li>No further charges will be made after cancellation</li>
              <li>Your account will revert to the Free plan at the end of the billing period</li>
            </ul>
          </Section>

          {/* Refund Eligibility */}
          <Section icon={RefreshCw} title="Refund Eligibility">
            <p>We offer refunds in the following cases:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Within 14 days of first payment:</strong> If you&apos;re not satisfied with the service
                after your first paid subscription, contact us within 14 days for a full refund.
              </li>
              <li>
                <strong>Service unavailability:</strong> If the service experiences significant downtime
                (more than 48 consecutive hours) during your billing period, you may request a prorated refund.
              </li>
              <li>
                <strong>Billing errors:</strong> If you were charged incorrectly or experienced duplicate
                charges, we will issue a full refund for the erroneous amount.
              </li>
            </ul>
          </Section>

          {/* Non-Refundable Items */}
          <Section icon={AlertCircle} title="Non-Refundable Items">
            <p>The following are generally not eligible for refunds:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Partial months of service after the 14-day satisfaction period</li>
              <li>Article add-on credits that have already been used</li>
              <li>Subscriptions that have been active for more than 14 days past the first charge</li>
            </ul>
            <p>
              However, we evaluate each case individually. If you have a special circumstance,
              please reach out and we&apos;ll do our best to help.
            </p>
          </Section>

          {/* How to Request a Refund */}
          <Section icon={Mail} title="How to Request a Refund">
            <p>To request a refund:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>
                Email us at{' '}
                <a href="mailto:support@kbpipe.io" className="text-gray-900 font-medium hover:underline">
                  support@kbpipe.io
                </a>{' '}
                with &ldquo;Refund Request&rdquo; in the subject line
              </li>
              <li>Include your account email and the reason for your request</li>
              <li>We will review your request and respond within 2 business days</li>
              <li>Approved refunds are processed within 5-10 business days</li>
            </ol>
          </Section>

          {/* Changes to Policy */}
          <Section icon={HelpCircle} title="Questions?">
            <p>
              If you have any questions about our refund policy or need help with your subscription,
              don&apos;t hesitate to contact us. We&apos;re here to help.
            </p>
          </Section>

          {/* Contact */}
          <div className="rounded-xl bg-gray-50 p-5 text-center space-y-2">
            <p className="text-sm text-gray-600">
              Need help? Contact our support team at
            </p>
            <a href="mailto:support@kbpipe.io" className="text-sm text-gray-900 font-medium hover:underline">
              support@kbpipe.io
            </a>
          </div>

          <div className="border-t border-gray-100 pt-4 text-center">
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              &larr; Back to KBPipe
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
