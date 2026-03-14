import Link from 'next/link';
import { FileText, UserCheck, ShieldCheck, Lightbulb, AlertTriangle, Server, XCircle, RefreshCw } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service - VideoToKB',
  description: 'Terms and conditions for using VideoToKB.',
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

export default function TermsPage() {
  return (
    <div className="flex min-h-screen items-start justify-center bg-gray-50/50 px-4 py-16">
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl bg-white shadow-xl shadow-gray-200/50 p-8 sm:p-10 space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Terms of Service</h1>
            <p className="text-sm text-gray-400">Last updated: March 14, 2026</p>
          </div>

          <div className="border-t border-gray-100" />

          <p className="text-sm leading-relaxed text-gray-600">
            By using VideoToKB, you agree to these terms. Please read them carefully before using the service.
          </p>

          {/* Service Description */}
          <Section icon={FileText} title="Service Description">
            <p>
              VideoToKB is a web application that converts video recordings into structured knowledge base
              articles. The service uses AI-powered transcription (AssemblyAI) and content generation
              (Anthropic Claude) to process your videos and produce formatted articles.
            </p>
            <p>
              The service is provided &ldquo;as is&rdquo; and output quality may vary depending on
              the input video quality, audio clarity, and content complexity.
            </p>
          </Section>

          {/* User Responsibilities */}
          <Section icon={UserCheck} title="User Responsibilities">
            <p>As a user of VideoToKB, you agree to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide accurate account information</li>
              <li>Keep your login credentials secure</li>
              <li>Only process videos you have the right to use</li>
              <li>Review and verify generated articles before publishing or distributing them</li>
              <li>Comply with all applicable laws and regulations</li>
            </ul>
          </Section>

          {/* Acceptable Use */}
          <Section icon={ShieldCheck} title="Acceptable Use">
            <p>You may not use VideoToKB to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Process content that is illegal, harmful, or violates others&apos; rights</li>
              <li>Attempt to reverse-engineer, exploit, or compromise the service</li>
              <li>Use automated tools to scrape or overload the service</li>
              <li>Share your account access with unauthorized users</li>
              <li>Generate content that is deliberately misleading or harmful</li>
            </ul>
          </Section>

          {/* Intellectual Property */}
          <Section icon={Lightbulb} title="Intellectual Property">
            <p>
              <strong>You own your content.</strong> All videos you submit, transcripts generated from your
              videos, and articles produced by the service remain your intellectual property. VideoToKB does
              not claim ownership over any content you create or process through the service.
            </p>
            <p>
              The VideoToKB application, its design, branding, and underlying technology are owned by
              VideoToKB and its licensors.
            </p>
          </Section>

          {/* Limitation of Liability */}
          <Section icon={AlertTriangle} title="Limitation of Liability">
            <p>
              VideoToKB is provided &ldquo;as is&rdquo; without warranties of any kind, express or implied.
              We do not guarantee the accuracy, completeness, or reliability of AI-generated content.
            </p>
            <p>
              To the maximum extent permitted by law, VideoToKB shall not be liable for any indirect,
              incidental, special, or consequential damages arising from your use of the service, including
              but not limited to loss of data, revenue, or business opportunities.
            </p>
          </Section>

          {/* Service Availability */}
          <Section icon={Server} title="Service Availability">
            <p>
              We strive to keep VideoToKB available at all times, but we do not guarantee uninterrupted access.
              The service may experience downtime due to maintenance, updates, or circumstances beyond our control.
            </p>
            <p>
              We rely on third-party services (AssemblyAI, Anthropic, Supabase) and their availability
              directly affects our service. We are not responsible for outages caused by these providers.
            </p>
          </Section>

          {/* Account Termination */}
          <Section icon={XCircle} title="Account Termination">
            <p>
              You may close your account at any time by contacting us. We reserve the right to suspend or
              terminate accounts that violate these terms or engage in abusive behavior.
            </p>
            <p>
              Upon account termination, your data will be deleted in accordance with our{' '}
              <Link href="/privacy" className="text-gray-900 font-medium hover:underline">
                Privacy Policy
              </Link>.
            </p>
          </Section>

          {/* Changes to Terms */}
          <Section icon={RefreshCw} title="Changes to Terms">
            <p>
              We may update these terms from time to time. When we make significant changes, we will notify
              you via email or a notice within the application. Continued use of the service after changes
              constitutes acceptance of the updated terms.
            </p>
          </Section>

          {/* Contact */}
          <div className="rounded-xl bg-gray-50 p-5 text-center space-y-2">
            <p className="text-sm text-gray-600">
              Questions about these terms? Reach out to us at
            </p>
            <a href="mailto:legal@videotokb.com" className="text-sm text-gray-900 font-medium hover:underline">
              legal@videotokb.com
            </a>
          </div>

          <div className="border-t border-gray-100 pt-4 text-center">
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              &larr; Back to VideoToKB
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
