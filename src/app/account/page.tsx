'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Key, Copy, Check, Download, AlertTriangle, Trash2, User, CreditCard, ArrowLeft } from 'lucide-react';
import { cn } from '@/utils/cn';
import { createClient } from '@/lib/supabase/client';
import { useWorkspace } from '@/contexts/workspace-context';
import { deleteWorkspace } from '@/lib/supabase/queries';

type Tab = 'api' | 'billing' | 'account';

export default function AccountPage() {
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
  name: string;
  prefix: string;
  createdAt: string;
}

function ApiKeysSection() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/api-keys');
        if (res.ok) {
          const data = await res.json();
          setKeys(data.keys ?? []);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'API Key' }),
      });
      if (!res.ok) throw new Error('Failed to create key');
      const data = await res.json();
      setNewKey(data.key);
      setKeys((prev) => [{ id: data.id, name: data.name, prefix: data.prefix, createdAt: new Date().toISOString() }, ...prev]);
    } catch {
      toast.error('Failed to create API key');
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    try {
      await fetch('/api/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success('API key revoked');
    } catch {
      toast.error('Failed to revoke key');
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <div className="text-sm text-gray-400">Loading API keys...</div>;

  return (
    <div className="space-y-6">
      {newKey && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm font-medium text-green-800 mb-2">New API key created — copy it now, it won&apos;t be shown again:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white rounded-lg px-3 py-2 text-sm font-mono text-gray-800 border border-green-200">{newKey}</code>
            <button onClick={() => handleCopy(newKey)} className="rounded-lg bg-green-600 px-3 py-2 text-white text-sm hover:bg-green-700">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">API Keys</h3>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-500 px-4 py-2 text-sm font-medium text-white hover:from-violet-700 hover:to-blue-600"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
            Create Key
          </button>
        </div>

        {keys.length === 0 ? (
          <p className="text-sm text-gray-400">No API keys yet. Create one to use the KBPipe API.</p>
        ) : (
          <div className="space-y-2">
            {keys.map((key) => (
              <div key={key.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                <div>
                  <code className="text-sm font-mono text-gray-600">{key.prefix}...</code>
                  <p className="text-xs text-gray-400 mt-0.5">Created {new Date(key.createdAt).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => handleRevoke(key.id)}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
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
