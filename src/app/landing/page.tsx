import Link from 'next/link';
import Image from 'next/image';
import { ScrollReveal, StaggerReveal } from '@/components/scroll-reveal';
import { UseCaseCarousel } from '@/components/use-case-carousel';
import { PricingSection } from '@/components/pricing-section';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white bg-grid overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="KBPipe" width={36} height={36} className="rounded-lg" />
            <span className="text-lg font-semibold text-gray-900">KBPipe</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="#pricing"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-4 py-2 hidden sm:block"
            >
              Pricing
            </a>
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-4 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/login?signup=true"
              className="text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600 rounded-full px-5 py-2 transition-all shadow-sm"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal direction="down" distance={20} duration={800}>
            <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-700 rounded-full px-4 py-1.5 text-sm font-medium mb-8">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI-Powered Knowledge Base Generator
            </div>
          </ScrollReveal>

          <ScrollReveal duration={900} delay={100}>
            <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 tracking-tight leading-[1.1]">
              Turn any content into{' '}
              <span className="bg-gradient-to-r from-violet-600 to-blue-500 bg-clip-text text-transparent">
                publish-ready KB articles
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={250} duration={800}>
            <p className="mt-6 text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
              Paste a video URL, a user story, a transcript, or any text —
              KBPipe turns it into a structured, professional knowledge base article in minutes.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={400} duration={800}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login?signup=true"
                className="w-full sm:w-auto text-base font-medium text-white bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600 rounded-full px-8 py-3.5 transition-all shadow-lg shadow-violet-500/25"
              >
                Start Creating — It&apos;s Free
              </Link>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto text-base font-medium text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 rounded-full px-8 py-3.5 transition-all"
              >
                See How It Works
              </a>
            </div>

            <p className="mt-5 text-sm text-gray-400">No credit card required</p>
          </ScrollReveal>
        </div>
      </section>

      {/* Input types showcase */}
      <section className="py-16 px-6 bg-gray-50/70">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <p className="text-center text-sm font-medium text-gray-400 uppercase tracking-wider mb-8">
              Works with any content source
            </p>
          </ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StaggerReveal staggerMs={80} distance={25}>
              {[
                { icon: '🎬', label: 'Loom Videos', desc: 'Paste any Loom URL' },
                { icon: '▶️', label: 'YouTube', desc: 'Any YouTube video' },
                { icon: '📁', label: 'Google Drive', desc: 'Shared video files' },
                { icon: '📝', label: 'Any Text', desc: 'User stories, specs, notes' },
              ].map((source) => (
                <div
                  key={source.label}
                  className="bg-white rounded-2xl p-5 text-center border border-gray-100 hover:border-violet-200 hover:shadow-sm transition-all"
                >
                  <div className="text-3xl mb-3">{source.icon}</div>
                  <div className="font-semibold text-gray-900 text-sm">{source.label}</div>
                  <div className="text-xs text-gray-400 mt-1">{source.desc}</div>
                </div>
              ))}
            </StaggerReveal>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
              Three steps. That&apos;s it.
            </h2>
            <p className="text-center text-gray-500 mb-14 max-w-lg mx-auto">
              No complex setup, no learning curve. Paste your content and get a professional article.
            </p>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8">
            <StaggerReveal staggerMs={150} distance={35}>
              {[
                {
                  step: '1',
                  title: 'Paste Your Content',
                  desc: 'Drop a video URL from Loom, YouTube, or Google Drive. Or paste any text — user stories, meeting notes, specifications.',
                  icon: (
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                    </svg>
                  ),
                },
                {
                  step: '2',
                  title: 'Choose a Template',
                  desc: 'Pick the article type: How-to Guide, Feature Explainer, Troubleshooting, Onboarding — or create your own.',
                  icon: (
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 3h1a2.25 2.25 0 012.236 2.028" />
                    </svg>
                  ),
                },
                {
                  step: '3',
                  title: 'Get Your Article',
                  desc: 'AI generates a structured, publish-ready article. Review, edit, and export as Markdown, HTML, or Word.',
                  icon: (
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  ),
                },
              ].map((item) => (
                <div key={item.step} className="relative">
                  <div className="bg-gradient-to-br from-violet-50 to-blue-50 rounded-2xl p-7 h-full border border-violet-100/50">
                    <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-violet-600 mb-5">
                      {item.icon}
                    </div>
                    <div className="text-xs font-bold text-violet-500 uppercase tracking-wider mb-2">
                      Step {item.step}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </StaggerReveal>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-20 px-6 bg-gray-50/70">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
              Built for teams who create knowledge
            </h2>
            <p className="text-center text-gray-500 mb-14 max-w-lg mx-auto">
              Everything you need to turn raw content into professional documentation.
            </p>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StaggerReveal staggerMs={80} distance={25}>
              {[
                {
                  title: 'Custom Templates',
                  desc: 'Define your own article types with custom AI prompts. Your articles, your structure, your voice.',
                  icon: '🎨',
                },
                {
                  title: 'Platform Profiles',
                  desc: 'Generate HTML styled exactly for your KB platform — HelpJuice, Zendesk, Intercom, or custom.',
                  icon: '🎯',
                },
                {
                  title: 'Multi-Workspace',
                  desc: 'Separate workspaces for different products, clients, or teams. Each with its own settings.',
                  icon: '🏢',
                },
                {
                  title: 'Company Context',
                  desc: 'Set your company info once. Every article automatically uses your terminology and tone.',
                  icon: '🧠',
                },
                {
                  title: 'Export Anywhere',
                  desc: 'Copy as Markdown, download formatted HTML, or export as a Word document. Your content, your format.',
                  icon: '📤',
                },
                {
                  title: 'API Access',
                  desc: 'Generate articles programmatically. Integrate with your CI/CD pipeline, Zapier, or any workflow.',
                  icon: '⚡',
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-violet-200 hover:shadow-md transition-all group"
                >
                  <div className="text-2xl mb-4">{feature.icon}</div>
                  <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-violet-700 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </StaggerReveal>
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
              Who uses KBPipe?
            </h2>
            <p className="text-center text-gray-500 mb-14 max-w-lg mx-auto">
              Teams that need to turn tribal knowledge into searchable, shareable documentation.
            </p>
          </ScrollReveal>

          <ScrollReveal>
            <UseCaseCarousel />
          </ScrollReveal>
        </div>
      </section>

      {/* Pricing */}
      <PricingSection />

      {/* Security */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
              Your content stays yours
            </h2>
            <p className="text-center text-gray-500 mb-14 max-w-lg mx-auto">
              Enterprise-grade security by default. No compromises.
            </p>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-6">
            <StaggerReveal staggerMs={100}>
              <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-3 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
                  <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-900">No data stored</h3>
                <p className="text-sm text-gray-500">Videos and transcripts are processed in memory only. Nothing is retained after your article is generated.</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-3 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
                  <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-900">Complete isolation</h3>
                <p className="text-sm text-gray-500">Row-level security ensures every workspace is fully isolated. No cross-tenant data access, ever.</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-3 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
                  <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-900">No AI training</h3>
                <p className="text-sm text-gray-500">Your content is never used to train AI models. Anthropic and AssemblyAI do not train on API inputs.</p>
              </div>
            </StaggerReveal>
          </div>

          <ScrollReveal>
            <div className="text-center mt-10">
              <Link
                href="/security"
                className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors underline underline-offset-4"
              >
                Read our full security overview &rarr;
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal distance={50} duration={900}>
            <div className="bg-gradient-to-br from-violet-600 to-blue-600 rounded-3xl p-12 text-white">
              <h2 className="text-3xl font-bold mb-4">
                Stop writing articles from scratch
              </h2>
              <p className="text-violet-100 text-lg mb-8 max-w-md mx-auto">
                Your content already exists in videos, meetings, and docs.
                Let AI structure it into publish-ready articles.
              </p>
              <Link
                href="/login?signup=true"
                className="inline-block bg-white text-violet-700 font-semibold rounded-full px-8 py-3.5 hover:bg-violet-50 transition-colors shadow-lg"
              >
                Get Started Free
              </Link>
              <p className="mt-4 text-sm text-violet-200">No credit card required</p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="KBPipe" width={28} height={28} className="rounded-md" />
            <span className="text-sm font-medium text-gray-500">KBPipe</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="/docs" className="hover:text-gray-600 transition-colors">
              API Docs
            </Link>
            <Link href="/security" className="hover:text-gray-600 transition-colors">
              Security
            </Link>
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-gray-600 transition-colors">
              Terms
            </Link>
            <Link href="/refund" className="hover:text-gray-600 transition-colors">
              Refund Policy
            </Link>
            <Link href="/dpa" className="hover:text-gray-600 transition-colors">
              DPA
            </Link>
            <a href="mailto:support@kbpipe.io" className="hover:text-gray-600 transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
