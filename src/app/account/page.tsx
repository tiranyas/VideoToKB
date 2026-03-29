'use client';

import { useState, useEffect, Suspense } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Key, Copy, Check, Download, AlertTriangle, Trash2, User, CreditCard, ArrowLeft, Plus, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/utils/cn';
import { createClient } from '@/lib/supabase/client';
import { useWorkspace } from '@/contexts/workspace-context';
import { deleteWorkspace } from '@/lib/supabase/queries';

type Tab = 'api' | 'billing' | 'account';

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Loading...</div>}>
      <AccountPageInner />
    </Suspense>
  );
}

function AccountPageInner() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) || 'api';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  const tabs: { id: Tab; label: string; icon: typeof Key }[] = [
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'account', label: 'Account', icon: User },
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/settings" className="text-gray-400 hover:text-gray-600 transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Account Settings</h1>
            </div>
            <p className="text-xs text-gray-400">Manage your personal account, API keys, and billing</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-gray-100 rounded-full p-1 flex mb-8" style={{ maxWidth: 400 }}>
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition-all',
                activeTab === id
                  ? 'bg-gray-800 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'api' && <ApiKeysSection />}
        {activeTab === 'billing' && <BillingSection />}
        {activeTab === 'account' && <AccountSection />}
      </div>
    </div>
  );
}

// ── API Keys ────────────────────────────────────────────

interface ApiKeyInfo {
  id: string;
  key_prefix: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
}

function ApiKeysSection() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => { loadKeys(); }, []);

  async function loadKeys() {
    try {
      const res = await fetch('/api/api-keys');
      const data = await res.json();
      if (data.keys) setKeys(data.keys);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'API Key' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewKey(data.key);
      await loadKeys();
      toast.success('API key created');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create key');
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    try {
      const res = await fetch('/api/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to revoke');
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success('API key revoked');
    } catch {
      toast.error('Failed to revoke API key');
    }
  }

  async function handleCopyKey() {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://app.kbpipe.com';

  const curlExample = `curl -X POST ${baseUrl}/api/v1/generate \\
  -H "Authorization: Bearer vtk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"videoUrl": "https://www.loom.com/share/..."}'`;

  const curlTranscriptExample = `curl -X POST ${baseUrl}/api/v1/generate \\
  -H "Authorization: Bearer vtk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"transcript": "Your transcript text here..."}'`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* New key alert */}
      {newKey && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h4 className="text-sm font-semibold text-amber-800">Save your API key now</h4>
          </div>
          <p className="text-xs text-amber-600 mb-3">
            This is the only time you&apos;ll see this key. Copy it and store it securely.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-xl bg-white border border-amber-200 px-4 py-3 text-sm font-mono text-gray-900 break-all">
              {showKey ? newKey : newKey.slice(0, 12) + '\u2022'.repeat(36)}
            </code>
            <button
              onClick={() => setShowKey(!showKey)}
              className="rounded-xl bg-white border border-amber-200 px-3 py-3 text-amber-600 hover:bg-amber-50 transition-colors"
              title={showKey ? 'Hide' : 'Show'}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              onClick={handleCopyKey}
              className="rounded-xl bg-gradient-to-r from-violet-600 to-blue-500 px-4 py-3 text-sm font-medium text-white hover:from-violet-700 hover:to-blue-600 transition-all"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <button
            onClick={() => setNewKey(null)}
            className="mt-3 text-xs text-amber-500 hover:text-amber-700 transition-colors"
          >
            Dismiss — I&apos;ve saved my key
          </button>
        </div>
      )}

      {/* Existing keys */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Key className="h-5 w-5 text-gray-400" />
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-gray-900">API Keys</h3>
              <p className="text-xs text-gray-400">Use API keys to generate articles programmatically</p>
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || keys.length >= 3}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all',
              creating || keys.length >= 3 ? 'bg-gray-300 cursor-not-allowed' : 'bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600'
            )}
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create Key
          </button>
        </div>

        {keys.length === 0 ? (
          <div className="rounded-xl bg-gray-50 px-4 py-8 text-center">
            <Key className="mx-auto h-8 w-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No API keys yet</p>
            <p className="text-xs text-gray-300 mt-1">Create a key to start using the API</p>
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <code className="text-sm font-mono text-gray-600">{k.key_prefix}{'\u2022'.repeat(12)}</code>
                  <span className="text-xs text-gray-400">{k.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-300">
                    {k.last_used_at
                      ? `Last used ${new Date(k.last_used_at).toLocaleDateString()}`
                      : 'Never used'}
                  </span>
                  <button
                    onClick={() => handleRevoke(k.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors"
                    title="Revoke key"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* API Usage Guide */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
        <h3 className="text-lg font-semibold tracking-tight text-gray-900 mb-1">Quick Start</h3>
        <p className="text-xs text-gray-400 mb-5">
          One endpoint to generate articles. Works with Zapier, Make, or any HTTP client.
        </p>

        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-md bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">POST</span>
              <code className="text-sm font-mono text-gray-700">/api/v1/generate</code>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">From a video URL:</p>
            <pre className="rounded-xl bg-gray-900 px-4 py-3 text-sm text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">
              {curlExample}
            </pre>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">From a transcript:</p>
            <pre className="rounded-xl bg-gray-900 px-4 py-3 text-sm text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">
              {curlTranscriptExample}
            </pre>
          </div>

          <div className="rounded-xl bg-gray-50 px-4 py-3">
            <p className="text-xs font-medium text-gray-700 mb-2">Response:</p>
            <pre className="text-xs text-gray-500 font-mono whitespace-pre-wrap">{`{
  "id": "uuid",
  "title": "Article Title",
  "markdown": "# Full article in markdown...",
  "html": "<div>Platform HTML (if applicable)</div>",
  "platform": "HelpJuice",
  "articleType": "Screen Overview"
}`}</pre>
          </div>

          <div className="rounded-xl bg-blue-50/50 border border-blue-100 px-4 py-3">
            <p className="text-xs text-blue-700">
              <strong>Optional parameters:</strong>{' '}
              <code className="text-blue-600">&quot;articleType&quot;</code> and{' '}
              <code className="text-blue-600">&quot;platform&quot;</code> override your default settings.
              Pass the ID of any article type or platform profile.
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 px-4 py-3">
            <p className="text-xs font-medium text-gray-700 mb-1">Rate limit:</p>
            <p className="text-xs text-gray-500">5 requests per minute per API key</p>
          </div>
        </div>
      </div>

      {/* MCP / Claude Integration */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
            <span className="text-white text-sm font-bold">&#x26A1;</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-gray-900">Claude Integration (MCP)</h3>
            <p className="text-xs text-gray-400">Generate articles by talking to Claude directly</p>
          </div>
        </div>

        <div className="space-y-4 mt-4">
          <p className="text-xs text-gray-500">
            Add KBPipe as an MCP tool in Claude Desktop or Claude Code. Then just say
            <em className="text-gray-700"> &ldquo;generate a KB article from this Loom video&rdquo;</em> and Claude will call KBPipe for you.
          </p>

          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">1. Install the MCP server:</p>
            <pre className="rounded-xl bg-gray-900 px-4 py-3 text-sm text-green-400 font-mono overflow-x-auto">
{`cd mcp-server && npm install && npm run build`}
            </pre>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">2. Add to Claude Desktop config <code className="text-gray-600 text-xs">(claude_desktop_config.json)</code>:</p>
            <pre className="rounded-xl bg-gray-900 px-4 py-3 text-sm text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">
{`{
  "mcpServers": {
    "kbpipe": {
      "command": "node",
      "args": ["path/to/mcp-server/dist/index.js"],
      "env": {
        "KBPIPE_API_KEY": "vtk_your_key_here",
        "KBPIPE_URL": "${baseUrl}"
      }
    }
  }
}`}
            </pre>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">3. Now talk to Claude:</p>
            <div className="rounded-xl bg-gray-50 px-4 py-3 space-y-2">
              <p className="text-xs text-gray-500 italic">&ldquo;Generate a KB article from this Loom video: https://www.loom.com/share/...&rdquo;</p>
              <p className="text-xs text-gray-500 italic">&ldquo;Turn this transcript into a knowledge base article for our HelpJuice&rdquo;</p>
              <p className="text-xs text-gray-500 italic">&ldquo;Create a Notion article from the following meeting notes...&rdquo;</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Billing ─────────────────────────────────────────────

function BillingSection() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Billing & Plan</h3>
      <p className="text-sm text-gray-400 mb-4">Manage your subscription and view usage.</p>
      <Link
        href="/billing"
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:from-violet-700 hover:to-blue-600 transition-all"
      >
        <CreditCard className="h-4 w-4" />
        Go to Billing Page
      </Link>
    </div>
  );
}

// ── Account (Export + Delete) ───────────────────────────

function AccountSection() {
  const [confirmText, setConfirmText] = useState('');
  const [wsConfirmText, setWsConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingWs, setIsDeletingWs] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { activeWorkspace, workspaces, refreshWorkspaces } = useWorkspace();

  const isDeleteConfirmed = confirmText === 'DELETE';
  const isWsDeleteConfirmed = wsConfirmText === activeWorkspace?.name;

  async function handleExport() {
    setIsExporting(true);
    try {
      const res = await fetch('/api/account/export');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kbpipe-data-export.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Data exported');
    } catch {
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDeleteWorkspace() {
    if (!isWsDeleteConfirmed || !activeWorkspace) return;
    setIsDeletingWs(true);
    try {
      await deleteWorkspace(supabase, activeWorkspace.id);
      await refreshWorkspaces();
      toast.success('Workspace deleted');
      if (workspaces.length <= 1) router.push('/onboarding');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete workspace');
    } finally {
      setIsDeletingWs(false);
      setWsConfirmText('');
    }
  }

  async function handleDeleteAccount() {
    if (!isDeleteConfirmed) return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' });
      if (!res.ok) throw new Error('Deletion failed');
      toast.success('Account deleted');
      router.push('/login');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete account');
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Export */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
        <div className="flex items-center gap-3 mb-2">
          <Download className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Export My Data</h3>
        </div>
        <p className="text-xs text-gray-400 mb-4">Download all your data as a JSON file.</p>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all',
            isExporting ? 'bg-gray-300' : 'bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600'
          )}
        >
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {isExporting ? 'Exporting...' : 'Export Data'}
        </button>
      </div>

      {/* Delete Workspace */}
      {activeWorkspace && (
        <div className="rounded-2xl border border-amber-100 bg-white shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-amber-600">Delete Workspace</h3>
          </div>
          <p className="text-sm text-amber-700 mb-4">
            Permanently delete <strong>&quot;{activeWorkspace.name}&quot;</strong> and all its articles, settings, and integrations. Your account and other workspaces are not affected.
          </p>
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Type <span className="font-mono text-amber-600">{activeWorkspace.name}</span> to confirm
            </label>
            <input
              type="text"
              value={wsConfirmText}
              onChange={(e) => setWsConfirmText(e.target.value)}
              placeholder={activeWorkspace.name}
              className="w-full max-w-xs rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-mono focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-100"
            />
          </div>
          <button
            onClick={handleDeleteWorkspace}
            disabled={!isWsDeleteConfirmed || isDeletingWs}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white',
              !isWsDeleteConfirmed || isDeletingWs ? 'bg-gray-300' : 'bg-amber-500 hover:bg-amber-600'
            )}
          >
            {isDeletingWs ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {isDeletingWs ? 'Deleting...' : 'Delete Workspace'}
          </button>
        </div>
      )}

      {/* Delete Account */}
      <div className="rounded-2xl border border-red-100 bg-white shadow-sm p-6">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h3 className="text-lg font-semibold text-red-600">Delete My Account</h3>
        </div>
        <p className="text-sm text-red-700 mb-4">
          Permanently delete your account and all owned workspaces. This cannot be undone.
        </p>
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Type <span className="font-mono text-red-500">DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="w-full max-w-xs rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-mono focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100"
          />
        </div>
        <button
          onClick={handleDeleteAccount}
          disabled={!isDeleteConfirmed || isDeleting}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white',
            !isDeleteConfirmed || isDeleting ? 'bg-gray-300' : 'bg-red-500 hover:bg-red-600'
          )}
        >
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          {isDeleting ? 'Deleting...' : 'Permanently Delete Account'}
        </button>
      </div>
    </div>
  );
}
