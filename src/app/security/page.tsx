import Link from 'next/link';
import {
  Shield,
  Lock,
  Trash2,
  Eye,
  Server,
  UserCheck,
  Database,
  FileX,
} from 'lucide-react';

export const metadata = {
  title: 'Security - KBPipe',
  description: 'How KBPipe protects your data and ensures enterprise-grade security.',
};

function SecurityCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100">
          <Icon className="h-4.5 w-4.5 text-gray-600" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      <p className="text-sm leading-relaxed text-gray-600 pl-12">{description}</p>
    </div>
  );
}

export default function SecurityPage() {
  return (
    <div className="flex min-h-screen items-start justify-center bg-gray-50/50 px-4 py-16">
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl bg-white shadow-xl shadow-gray-200/50 p-8 sm:p-10 space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
              Security at KBPipe
            </h1>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Your content is your business. Here&apos;s how we protect it at every step.
            </p>
          </div>

          <div className="border-t border-gray-100" />

          {/* Key promise */}
          <div className="rounded-xl bg-gray-50 p-5 space-y-2">
            <p className="text-sm font-semibold text-gray-900">Our commitment</p>
            <p className="text-sm leading-relaxed text-gray-600">
              KBPipe processes your videos to create knowledge base articles. We don&apos;t store your
              videos, we don&apos;t keep your transcripts, and we never use your content to train AI
              models. Your data belongs to you.
            </p>
          </div>

          {/* Security cards */}
          <div className="space-y-3">
            <SecurityCard
              icon={FileX}
              title="No video or transcript storage"
              description="Your video URL is used only to extract audio for transcription. The transcript is processed in memory to generate your article, then discarded. Only the final article you create is saved."
            />

            <SecurityCard
              icon={Database}
              title="Complete data isolation"
              description="Every workspace is isolated using Supabase Row-Level Security (RLS). Users can only access their own data. There is no cross-tenant data access, even at the database level."
            />

            <SecurityCard
              icon={Lock}
              title="Encryption in transit and at rest"
              description="All data is encrypted using TLS 1.2+ in transit and AES-256 at rest. Your articles, settings, and account data are protected both when moving between services and when stored."
            />

            <SecurityCard
              icon={Eye}
              title="No AI training on your data"
              description="We use Anthropic's Claude API, which explicitly does not use API inputs for model training. Your content is never used to improve AI models. AssemblyAI similarly does not train on customer audio."
            />

            <SecurityCard
              icon={UserCheck}
              title="Minimal data collection"
              description="We collect only what's needed: your email for authentication and the articles you generate. No analytics cookies, no tracking pixels, no third-party advertising. Essential auth cookies only."
            />

            <SecurityCard
              icon={Server}
              title="Trusted infrastructure"
              description="KBPipe runs on Vercel (SOC 2 Type II) with data stored in Supabase (SOC 2 Type II, hosted on AWS). All sub-processors maintain enterprise-grade security certifications."
            />

            <SecurityCard
              icon={Lock}
              title="API keys are hashed"
              description="If you use our API, your API keys are SHA-256 hashed before storage. Even we cannot see your original key. Keys are prefixed with vtk_ for easy identification and rotation."
            />

            <SecurityCard
              icon={Trash2}
              title="Full account deletion"
              description="You can delete your entire account and all associated data at any time from Settings. This removes all articles, workspace data, preferences, and your authentication record. No data is retained."
            />
          </div>

          {/* Third-party services */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight text-gray-900">
              Third-party services
            </h2>
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left font-medium text-gray-700 px-4 py-2.5">Service</th>
                    <th className="text-left font-medium text-gray-700 px-4 py-2.5">Purpose</th>
                    <th className="text-left font-medium text-gray-700 px-4 py-2.5">Data shared</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-2.5 text-gray-900 font-medium">AssemblyAI</td>
                    <td className="px-4 py-2.5 text-gray-600">Transcription</td>
                    <td className="px-4 py-2.5 text-gray-600">Audio URL (temporary)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-gray-900 font-medium">Anthropic Claude</td>
                    <td className="px-4 py-2.5 text-gray-600">Article generation</td>
                    <td className="px-4 py-2.5 text-gray-600">Transcript text (not stored)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-gray-900 font-medium">Supabase</td>
                    <td className="px-4 py-2.5 text-gray-600">Database &amp; auth</td>
                    <td className="px-4 py-2.5 text-gray-600">Account &amp; article data</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-gray-900 font-medium">Vercel</td>
                    <td className="px-4 py-2.5 text-gray-600">Hosting</td>
                    <td className="px-4 py-2.5 text-gray-600">Request metadata</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Contact */}
          <div className="rounded-xl bg-gray-50 p-5 text-center space-y-2">
            <p className="text-sm text-gray-600">
              Have security questions or need a DPA?
            </p>
            <a
              href="mailto:security@kbpipe.io"
              className="text-sm text-gray-900 font-medium hover:underline"
            >
              security@kbpipe.io
            </a>
          </div>

          {/* Links */}
          <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">
              Privacy Policy
            </Link>
            <span>&middot;</span>
            <Link href="/terms" className="hover:text-gray-600 transition-colors">
              Terms of Service
            </Link>
            <span>&middot;</span>
            <Link href="/" className="hover:text-gray-600 transition-colors">
              Back to KBPipe
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
