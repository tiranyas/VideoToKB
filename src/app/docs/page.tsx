import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'API Documentation',
  description: 'KBPipe REST API documentation — generate knowledge base articles programmatically.',
};

/* ── Reusable components ───────────────────────────── */

function Badge({ children, color = 'violet' }: { children: React.ReactNode; color?: 'violet' | 'green' | 'amber' | 'red' | 'gray' }) {
  const colors = {
    violet: 'bg-violet-100 text-violet-700',
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-block text-xs font-semibold rounded-full px-2.5 py-0.5 ${colors[color]}`}>
      {children}
    </span>
  );
}

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden my-4">
      {title && (
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 text-xs font-medium text-gray-500">
          {title}
        </div>
      )}
      <pre className="bg-gray-900 text-gray-100 text-sm p-4 overflow-x-auto leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 mb-16">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-3 border-b border-gray-100">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ParamRow({ name, type, required, children }: { name: string; type: string; required?: boolean; children: React.ReactNode }) {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-3 pr-4 align-top">
        <code className="text-sm font-mono text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded">{name}</code>
      </td>
      <td className="py-3 pr-4 align-top text-sm text-gray-500">{type}</td>
      <td className="py-3 pr-4 align-top">
        {required ? <Badge color="amber">required</Badge> : <Badge color="gray">optional</Badge>}
      </td>
      <td className="py-3 text-sm text-gray-600">{children}</td>
    </tr>
  );
}

/* ── Page ──────────────────────────────────────────── */

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/landing" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="KBPipe" width={36} height={36} className="rounded-lg" />
            <span className="text-lg font-semibold text-gray-900">KBPipe</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-400">API Docs</span>
            <Link
              href="/login"
              className="text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600 rounded-full px-5 py-2 transition-all shadow-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-28 pb-20">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">API Documentation</h1>
          <p className="text-lg text-gray-500 leading-relaxed">
            Generate knowledge base articles programmatically. Send a video URL or text,
            get a structured article back.
          </p>
          <div className="flex items-center gap-3 mt-6">
            <Badge color="green">v1</Badge>
            <span className="text-sm text-gray-400">Base URL: <code className="text-gray-600">https://kbpipe.io/api/v1</code></span>
          </div>
        </div>

        {/* Table of Contents */}
        <div className="bg-gray-50 rounded-2xl p-6 mb-16 border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">On this page</h3>
          <ul className="space-y-2">
            {[
              { href: '#authentication', label: 'Authentication' },
              { href: '#generate', label: 'Generate Article' },
              { href: '#parameters', label: 'Parameters' },
              { href: '#response', label: 'Response' },
              { href: '#errors', label: 'Error Handling' },
              { href: '#rate-limits', label: 'Rate Limits' },
              { href: '#examples', label: 'Examples' },
            ].map((item) => (
              <li key={item.href}>
                <a href={item.href} className="text-sm text-gray-600 hover:text-violet-600 transition-colors">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Authentication */}
        <Section id="authentication" title="Authentication">
          <p className="text-gray-600 mb-4 leading-relaxed">
            All API requests require an API key passed in the <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">Authorization</code> header.
            API keys are prefixed with <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">vtk_</code> and can be generated from your
            {' '}<Link href="/settings" className="text-violet-600 hover:text-violet-700 underline">Settings page</Link>.
          </p>
          <CodeBlock title="Authorization Header">{`Authorization: Bearer vtk_your_api_key_here`}</CodeBlock>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4 text-sm text-amber-800">
            <strong>Keep your API key secret.</strong> Do not expose it in client-side code or public repositories.
            If compromised, revoke it immediately from Settings.
          </div>
        </Section>

        {/* Generate Article */}
        <Section id="generate" title="Generate Article">
          <div className="flex items-center gap-3 mb-4">
            <Badge color="green">POST</Badge>
            <code className="text-sm text-gray-700">/api/v1/generate</code>
          </div>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Generate a knowledge base article from a video URL or raw text.
            Returns structured markdown and optionally platform-formatted HTML.
          </p>

          <CodeBlock title="Quick Start (cURL)">{`curl -X POST https://kbpipe.io/api/v1/generate \\
  -H "Authorization: Bearer vtk_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "videoUrl": "https://www.youtube.com/watch?v=example"
  }'`}</CodeBlock>

          <CodeBlock title="With text input">{`curl -X POST https://kbpipe.io/api/v1/generate \\
  -H "Authorization: Bearer vtk_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "transcript": "Your text content here — user stories, meeting notes, specs...",
    "articleType": "how-to-guide",
    "platform": "zendesk"
  }'`}</CodeBlock>
        </Section>

        {/* Parameters */}
        <Section id="parameters" title="Request Parameters">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <th className="py-3 pr-4 text-xs font-semibold text-gray-400 uppercase">Parameter</th>
                  <th className="py-3 pr-4 text-xs font-semibold text-gray-400 uppercase">Type</th>
                  <th className="py-3 pr-4 text-xs font-semibold text-gray-400 uppercase">Required</th>
                  <th className="py-3 text-xs font-semibold text-gray-400 uppercase">Description</th>
                </tr>
              </thead>
              <tbody>
                <ParamRow name="videoUrl" type="string" required>
                  URL of a Loom, YouTube, or Google Drive video to process. Required if <code className="text-xs bg-gray-100 px-1 rounded">transcript</code> is not provided.
                </ParamRow>
                <ParamRow name="transcript" type="string" required>
                  Raw text content (user story, meeting notes, specs). Required if <code className="text-xs bg-gray-100 px-1 rounded">videoUrl</code> is not provided.
                </ParamRow>
                <ParamRow name="articleType" type="string">
                  Article type ID. Falls back to your workspace default if omitted. Examples: <code className="text-xs bg-gray-100 px-1 rounded">how-to-guide</code>, <code className="text-xs bg-gray-100 px-1 rounded">feature-explainer</code>
                </ParamRow>
                <ParamRow name="platform" type="string">
                  Platform profile ID for HTML output. Falls back to workspace default. Examples: <code className="text-xs bg-gray-100 px-1 rounded">zendesk</code>, <code className="text-xs bg-gray-100 px-1 rounded">intercom</code>, <code className="text-xs bg-gray-100 px-1 rounded">helpjuice</code>
                </ParamRow>
                <ParamRow name="workspace" type="string">
                  Workspace ID. Falls back to your active workspace, then your first workspace.
                </ParamRow>
              </tbody>
            </table>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-6 text-sm text-blue-800">
            <strong>Note:</strong> Either <code className="bg-blue-100 px-1 rounded">videoUrl</code> or <code className="bg-blue-100 px-1 rounded">transcript</code> is required. If both are provided, <code className="bg-blue-100 px-1 rounded">transcript</code> takes precedence.
          </div>
        </Section>

        {/* Response */}
        <Section id="response" title="Response">
          <p className="text-gray-600 mb-4 leading-relaxed">
            A successful response returns the generated article with metadata.
          </p>
          <CodeBlock title="200 OK">{`{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "How to Configure SSO in Your Dashboard",
  "markdown": "# How to Configure SSO in Your Dashboard\\n\\n## Overview\\n...",
  "html": "<article class=\\"kb-article\\">...</article>",
  "platform": "Zendesk",
  "articleType": "How-to Guide"
}`}</CodeBlock>

          <div className="overflow-x-auto mt-6">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <th className="py-3 pr-4 text-xs font-semibold text-gray-400 uppercase">Field</th>
                  <th className="py-3 pr-4 text-xs font-semibold text-gray-400 uppercase">Type</th>
                  <th className="py-3 text-xs font-semibold text-gray-400 uppercase">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-3 pr-4"><code className="text-sm font-mono text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded">id</code></td>
                  <td className="py-3 pr-4 text-sm text-gray-500">string</td>
                  <td className="py-3 text-sm text-gray-600">UUID of the saved article</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 pr-4"><code className="text-sm font-mono text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded">title</code></td>
                  <td className="py-3 pr-4 text-sm text-gray-500">string</td>
                  <td className="py-3 text-sm text-gray-600">Auto-extracted article title</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 pr-4"><code className="text-sm font-mono text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded">markdown</code></td>
                  <td className="py-3 pr-4 text-sm text-gray-500">string</td>
                  <td className="py-3 text-sm text-gray-600">Structured article in Markdown format</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 pr-4"><code className="text-sm font-mono text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded">html</code></td>
                  <td className="py-3 pr-4 text-sm text-gray-500">string?</td>
                  <td className="py-3 text-sm text-gray-600">Platform-formatted HTML (only when a platform profile is selected)</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 pr-4"><code className="text-sm font-mono text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded">platform</code></td>
                  <td className="py-3 pr-4 text-sm text-gray-500">string</td>
                  <td className="py-3 text-sm text-gray-600">Name of the platform used</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 pr-4"><code className="text-sm font-mono text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded">articleType</code></td>
                  <td className="py-3 pr-4 text-sm text-gray-500">string</td>
                  <td className="py-3 text-sm text-gray-600">Name of the article type used</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* Errors */}
        <Section id="errors" title="Error Handling">
          <p className="text-gray-600 mb-4 leading-relaxed">
            Errors return a JSON object with an <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">error</code> field.
          </p>
          <CodeBlock title="Error Response">{`{
  "error": "Missing or invalid Authorization header. Use: Bearer vtk_..."
}`}</CodeBlock>

          <div className="overflow-x-auto mt-6">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <th className="py-3 pr-4 text-xs font-semibold text-gray-400 uppercase">Status</th>
                  <th className="py-3 text-xs font-semibold text-gray-400 uppercase">Meaning</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { code: '400', desc: 'Bad request — missing required fields, invalid article type, or no workspace found' },
                  { code: '401', desc: 'Unauthorized — missing, malformed, or revoked API key' },
                  { code: '403', desc: 'Quota exceeded — upgrade your plan or wait for the next billing cycle' },
                  { code: '404', desc: 'Workspace not found or access denied' },
                  { code: '429', desc: 'Rate limit exceeded — max 5 requests per minute' },
                  { code: '500', desc: 'Server error — article generation failed' },
                ].map((err) => (
                  <tr key={err.code} className="border-b border-gray-100">
                    <td className="py-3 pr-4">
                      <Badge color={err.code.startsWith('4') ? 'amber' : 'red'}>{err.code}</Badge>
                    </td>
                    <td className="py-3 text-sm text-gray-600">{err.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Rate Limits */}
        <Section id="rate-limits" title="Rate Limits">
          <p className="text-gray-600 mb-4 leading-relaxed">
            The API enforces a sliding-window rate limit per API key.
          </p>
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-2xl font-bold text-gray-900">5</div>
                <div className="text-sm text-gray-500">requests per minute</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">300s</div>
                <div className="text-sm text-gray-500">max processing time</div>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            When rate limited, the response includes a <code className="bg-gray-100 px-1 rounded">Retry-After</code> header
            with the number of seconds to wait.
          </p>
        </Section>

        {/* Examples */}
        <Section id="examples" title="Examples">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">JavaScript / Node.js</h3>
          <CodeBlock title="fetch">{`const response = await fetch('https://kbpipe.io/api/v1/generate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer vtk_your_key',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    videoUrl: 'https://www.loom.com/share/abc123',
    articleType: 'how-to-guide',
    platform: 'zendesk',
  }),
});

const article = await response.json();
console.log(article.title);
console.log(article.html);`}</CodeBlock>

          <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-10">Python</h3>
          <CodeBlock title="requests">{`import requests

response = requests.post(
    'https://kbpipe.io/api/v1/generate',
    headers={'Authorization': 'Bearer vtk_your_key'},
    json={
        'transcript': 'Your raw text content here...',
        'articleType': 'feature-explainer',
    }
)

article = response.json()
print(article['title'])
print(article['markdown'])`}</CodeBlock>

          <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-10">MCP Server</h3>
          <p className="text-gray-600 mb-4 leading-relaxed">
            KBPipe also ships an{' '}
            <a
              href="https://github.com/modelcontextprotocol"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-600 hover:text-violet-700 underline"
            >
              MCP server
            </a>{' '}
            for AI assistant integration. Install it to let Claude, Cursor, or other AI tools
            generate KB articles directly.
          </p>
          <CodeBlock title="Install MCP Server">{`# Clone and build
cd mcp-server && npm install && npm run build

# Configure in your AI tool with:
#   KBPIPE_API_KEY=vtk_your_key
#   KBPIPE_BASE_URL=https://kbpipe.io  (optional, defaults to this)`}</CodeBlock>
        </Section>

        {/* CTA */}
        <div className="bg-gradient-to-br from-violet-50 to-blue-50 rounded-2xl p-8 border border-violet-100 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to get started?</h3>
          <p className="text-gray-500 mb-6">Create a free account and generate your API key in seconds.</p>
          <Link
            href="/login?signup=true"
            className="inline-block text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600 rounded-full px-6 py-2.5 transition-all shadow-sm"
          >
            Get Your API Key
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-sm text-gray-400">
          <span>&copy; {new Date().getFullYear()} KBPipe</span>
          <div className="flex items-center gap-6">
            <Link href="/landing" className="hover:text-gray-600 transition-colors">Home</Link>
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
