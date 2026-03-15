import Link from 'next/link';
import Image from 'next/image';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="KBify" width={32} height={32} />
            <span className="text-lg font-semibold text-gray-900">KBify</span>
          </div>
          <div className="flex items-center gap-3">
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
          <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-700 rounded-full px-4 py-1.5 text-sm font-medium mb-8">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            AI-Powered Knowledge Base Generator
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 tracking-tight leading-[1.1]">
            Turn any content into{' '}
            <span className="bg-gradient-to-r from-violet-600 to-blue-500 bg-clip-text text-transparent">
              publish-ready KB articles
            </span>
          </h1>

          <p className="mt-6 text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Paste a video URL, a user story, a transcript, or any text —
            KBify turns it into a structured, professional knowledge base article in minutes.
          </p>

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
        </div>
      </section>

      {/* Input types showcase */}
      <section className="py-16 px-6 bg-gray-50/70">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-sm font-medium text-gray-400 uppercase tracking-wider mb-8">
            Works with any content source
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
            Three steps. That&apos;s it.
          </h2>
          <p className="text-center text-gray-500 mb-14 max-w-lg mx-auto">
            No complex setup, no learning curve. Paste your content and get a professional article.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
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
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-20 px-6 bg-gray-50/70">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
            Built for teams who create knowledge
          </h2>
          <p className="text-center text-gray-500 mb-14 max-w-lg mx-auto">
            Everything you need to turn raw content into professional documentation.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
            Who uses KBify?
          </h2>
          <p className="text-center text-gray-500 mb-14 max-w-lg mx-auto">
            Teams that need to turn tribal knowledge into searchable, shareable documentation.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                role: 'Customer Success Teams',
                pain: 'You record Loom walkthroughs for customers all day — but those videos aren\'t searchable or reusable.',
                solution: 'Turn every Loom into a help center article automatically.',
              },
              {
                role: 'Technical Writers',
                pain: 'Your backlog is full of "we recorded a video of this, can you write the article?" requests.',
                solution: 'Convert the video backlog into structured articles in minutes, not days.',
              },
              {
                role: 'Product Teams',
                pain: 'You demo features in meetings but never find time to write the release notes or docs.',
                solution: 'Paste the meeting recording URL and get a feature article ready to publish.',
              },
              {
                role: 'Agencies & Consultants',
                pain: 'You manage documentation for multiple clients and need workspace isolation.',
                solution: 'Separate workspaces per client, each with custom templates and branding.',
              },
            ].map((useCase) => (
              <div
                key={useCase.role}
                className="rounded-2xl border border-gray-100 p-7 hover:border-violet-200 transition-all"
              >
                <h3 className="font-semibold text-gray-900 text-lg mb-3">{useCase.role}</h3>
                <p className="text-sm text-gray-500 mb-3">
                  <span className="text-red-400 font-medium">The problem:</span> {useCase.pain}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="text-green-500 font-medium">With KBify:</span> {useCase.solution}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
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
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="KBify" width={24} height={24} />
            <span className="text-sm font-medium text-gray-500">KBify</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-gray-600 transition-colors">
              Terms
            </Link>
            <a href="mailto:support@kbify.com" className="hover:text-gray-600 transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
