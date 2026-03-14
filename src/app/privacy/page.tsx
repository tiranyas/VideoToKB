import Link from 'next/link';
import { Shield, Database, Globe, Cookie, Clock, UserCheck, Mail, Scale } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy - KBify',
  description: 'How KBify handles your data and protects your privacy.',
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

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen items-start justify-center bg-gray-50/50 px-4 py-16">
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl bg-white shadow-xl shadow-gray-200/50 p-8 sm:p-10 space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Privacy Policy</h1>
            <p className="text-sm text-gray-400">Last updated: March 14, 2026</p>
          </div>

          <div className="border-t border-gray-100" />

          <p className="text-sm leading-relaxed text-gray-600">
            KBify is committed to protecting your privacy. This policy explains what data we collect,
            how we use it, and the rights you have over your information.
          </p>

          {/* Data Collected */}
          <Section icon={Database} title="Data We Collect">
            <p>We collect and store the following information when you use KBify:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account data</strong> &mdash; your email address for authentication</li>
              <li><strong>Video URLs</strong> &mdash; links you provide for transcription</li>
              <li><strong>Transcripts</strong> &mdash; text generated from your video recordings</li>
              <li><strong>Generated articles</strong> &mdash; knowledge base articles created from transcripts</li>
              <li><strong>Company information</strong> &mdash; company name and context you provide in settings</li>
            </ul>
          </Section>

          {/* Data Processing */}
          <Section icon={Globe} title="How Data Is Processed">
            <p>Your data is processed through the following services:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>AssemblyAI</strong> &mdash; receives your video/audio URLs to generate transcripts. AssemblyAI processes the audio content and returns text.</li>
              <li><strong>Anthropic (Claude API)</strong> &mdash; receives transcripts and company context to generate structured knowledge base articles. Anthropic does not use API inputs for model training.</li>
              <li><strong>Supabase</strong> &mdash; stores your account data, articles, and application data in a PostgreSQL database with row-level security.</li>
            </ul>
            <p>We do not sell your data to any third party. Data is shared with the above services solely to provide the core functionality of KBify.</p>
          </Section>

          {/* Third-Party Services */}
          <Section icon={Shield} title="Third-Party Services">
            <div className="rounded-xl bg-gray-50 p-4 space-y-2">
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Service</span>
                <span className="font-medium text-gray-700">Data Shared</span>
              </div>
              <div className="border-t border-gray-200" />
              <div className="flex justify-between">
                <span>AssemblyAI</span>
                <span className="text-right">Video/audio URLs</span>
              </div>
              <div className="flex justify-between">
                <span>Anthropic Claude</span>
                <span className="text-right">Transcripts, company context</span>
              </div>
              <div className="flex justify-between">
                <span>Supabase</span>
                <span className="text-right">All application data</span>
              </div>
            </div>
          </Section>

          {/* Cookies */}
          <Section icon={Cookie} title="Cookie Usage">
            <p>
              KBify uses <strong>essential cookies only</strong>. We use Supabase authentication cookies
              to keep you signed in. We do not use analytics cookies, advertising cookies, or any third-party
              tracking cookies.
            </p>
          </Section>

          {/* Data Retention */}
          <Section icon={Clock} title="Data Retention">
            <p>
              Your data is stored for as long as you maintain your account. You can delete individual articles
              at any time. If you wish to delete your entire account and all associated data, contact us and we
              will remove everything within 30 days.
            </p>
          </Section>

          {/* User Rights */}
          <Section icon={UserCheck} title="Your Rights">
            <p>Under the GDPR and applicable data protection laws, you have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Access</strong> &mdash; request a copy of all data we hold about you</li>
              <li><strong>Rectification</strong> &mdash; correct any inaccurate personal data</li>
              <li><strong>Deletion</strong> &mdash; request deletion of your data (&ldquo;right to be forgotten&rdquo;)</li>
              <li><strong>Export</strong> &mdash; receive your data in a portable, machine-readable format</li>
              <li><strong>Restriction</strong> &mdash; request we limit processing of your data</li>
              <li><strong>Objection</strong> &mdash; object to processing based on legitimate interest</li>
            </ul>
            <p>To exercise any of these rights, contact us at the email below.</p>
          </Section>

          {/* Legal Basis */}
          <Section icon={Scale} title="Legal Basis for Processing">
            <p>We process your data on the following legal bases under the GDPR:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Consent</strong> &mdash; you consent to data processing when you create an account and use the service</li>
              <li><strong>Legitimate interest</strong> &mdash; processing necessary to provide and improve the service</li>
              <li><strong>Contractual necessity</strong> &mdash; processing required to deliver the service you requested</li>
            </ul>
          </Section>

          {/* Contact */}
          <Section icon={Mail} title="Contact Us">
            <p>
              If you have questions about this privacy policy or want to exercise your data rights, reach out:
            </p>
            <p>
              <a href="mailto:privacy@kbify.com" className="text-gray-900 font-medium hover:underline">
                privacy@kbify.com
              </a>
            </p>
          </Section>

          <div className="border-t border-gray-100 pt-4 text-center">
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              &larr; Back to KBify
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
