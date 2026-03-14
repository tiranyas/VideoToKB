'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Pencil, Globe, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/utils/cn';
import type { CompanyContext, ArticleType, PlatformProfile } from '@/types';
import { createClient } from '@/lib/supabase/client';
import {
  getCompanyContext, upsertCompanyContext, deleteCompanyContext as deleteCompanyCtx,
  getArticleTypes, addArticleType, updateArticleType, deleteArticleType,
  getPlatformProfiles, addPlatformProfile, updatePlatformProfile, deletePlatformProfile,
} from '@/lib/supabase/queries';

type Tab = 'context' | 'article-types' | 'platforms';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('context');

  const tabs: { id: Tab; label: string; icon: typeof Globe }[] = [
    { id: 'context', label: 'Company Context', icon: Globe },
    { id: 'article-types', label: 'Article Types', icon: FileText },
    { id: 'platforms', label: 'Platforms', icon: FileText },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Settings</h1>
            <p className="text-xs text-gray-400 mt-1">Configure your article generation pipeline</p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            Generate Article <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Tabs */}
        <div className="bg-gray-100 rounded-full p-1 flex mb-8">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition-all',
                activeTab === id
                  ? 'bg-black text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'context' && <CompanyContextTab />}
        {activeTab === 'article-types' && <ArticleTypesTab />}
        {activeTab === 'platforms' && <PlatformProfilesTab />}
      </div>
    </div>
  );
}

// ── Company Context Tab ──────────────────────────────────

function CompanyContextTab() {
  const [context, setContext] = useState<CompanyContext | null>(null);
  const [url, setUrl] = useState('');
  const [manualText, setManualText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'url' | 'manual'>('url');
  const [userId, setUserId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const ctx = await getCompanyContext(supabase, user.id);
      setContext(ctx);
    })();
  }, []);

  async function handleScrapeUrl() {
    if (!url.trim() || !userId) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/scrape-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const newContext: CompanyContext = {
        id: crypto.randomUUID(),
        name: data.name,
        description: data.description,
        industry: data.industry,
        targetAudience: data.targetAudience,
        createdAt: new Date().toISOString(),
      };
      await upsertCompanyContext(supabase, userId, newContext);
      setContext(newContext);
      toast.success('Company context extracted successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to extract context');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveManual() {
    if (!manualText.trim() || !userId) return;
    const newContext: CompanyContext = {
      id: crypto.randomUUID(),
      name: 'My Company',
      description: manualText.trim(),
      createdAt: new Date().toISOString(),
    };
    await upsertCompanyContext(supabase, userId, newContext);
    setContext(newContext);
    toast.success('Company context saved');
  }

  async function handleDelete() {
    if (!userId) return;
    await deleteCompanyCtx(supabase, userId);
    setContext(null);
    toast.success('Company context removed');
  }

  async function handleUpdateField(field: keyof CompanyContext, value: string) {
    if (!context || !userId) return;
    const updated = { ...context, [field]: value };
    await upsertCompanyContext(supabase, userId, updated);
    setContext(updated);
  }

  if (context) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold tracking-tight text-gray-900">Current Company Context</h3>
            <button onClick={handleDelete} className="text-gray-300 hover:text-red-400 transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Company Name</label>
              <input
                type="text"
                value={context.name}
                onChange={(e) => handleUpdateField('name', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Description</label>
              <textarea
                value={context.description}
                onChange={(e) => handleUpdateField('description', e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Industry</label>
                <input
                  type="text"
                  value={context.industry ?? ''}
                  onChange={(e) => handleUpdateField('industry', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Target Audience</label>
                <input
                  type="text"
                  value={context.targetAudience ?? ''}
                  onChange={(e) => handleUpdateField('targetAudience', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
                />
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400">This context is injected into article generation to tailor content to your company.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
        <h3 className="text-lg font-semibold tracking-tight text-gray-900 mb-2">Add Company Context</h3>
        <p className="text-xs text-gray-400 mb-5">
          Provide information about your company so articles are tailored to your product, audience, and terminology.
        </p>

        <div className="bg-gray-100 rounded-full p-1 flex mb-5">
          <button
            onClick={() => setMode('url')}
            className={cn(
              'flex-1 rounded-full px-3 py-2 text-sm font-medium transition-all',
              mode === 'url' ? 'bg-black text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            From Website URL
          </button>
          <button
            onClick={() => setMode('manual')}
            className={cn(
              'flex-1 rounded-full px-3 py-2 text-sm font-medium transition-all',
              mode === 'manual' ? 'bg-black text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            Write Manually
          </button>
        </div>

        {mode === 'url' ? (
          <div className="space-y-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-company.com"
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3.5 text-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
            />
            <button
              onClick={handleScrapeUrl}
              disabled={isLoading || !url.trim()}
              className={cn(
                'w-full rounded-xl px-4 py-3 text-sm font-medium text-white transition-all',
                isLoading || !url.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-black hover:bg-gray-800'
              )}
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Analyzing website...
                </span>
              ) : (
                'Extract Company Info'
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Describe your company, product, target audience, and industry..."
              rows={6}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3.5 text-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all resize-y"
            />
            <button
              onClick={handleSaveManual}
              disabled={!manualText.trim()}
              className={cn(
                'w-full rounded-xl px-4 py-3 text-sm font-medium text-white transition-all',
                !manualText.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-black hover:bg-gray-800'
              )}
            >
              Save Context
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Article Types Tab ────────────────────────────────────

function ArticleTypesTab() {
  const [types, setTypes] = useState<ArticleType[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const data = await getArticleTypes(supabase);
      setTypes(data);
    })();
  }, []);

  async function handleSave(type: ArticleType) {
    await updateArticleType(supabase, type.id, {
      name: type.name,
      draftPrompt: type.draftPrompt,
      structurePrompt: type.structurePrompt,
    });
    setTypes((prev) => prev.map((t) => (t.id === type.id ? type : t)));
    setEditing(null);
    toast.success('Article type updated');
  }

  async function handleAdd(type: ArticleType) {
    await addArticleType(supabase, type);
    const data = await getArticleTypes(supabase);
    setTypes(data);
    setShowNew(false);
    toast.success('Article type added');
  }

  async function handleRemove(id: string) {
    await deleteArticleType(supabase, id);
    const data = await getArticleTypes(supabase);
    setTypes(data);
    toast.success('Article type removed');
  }

  return (
    <div className="space-y-3">
      {types.map((type) =>
        editing === type.id ? (
          <ArticleTypeEditor
            key={type.id}
            initial={type}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <div key={type.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">{type.name}</h3>
                {type.isDefault && (
                  <span className="text-xs text-gray-400">Default preset</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setEditing(type.id)} className="text-gray-300 hover:text-gray-900 transition-colors">
                  <Pencil className="h-4 w-4" />
                </button>
                {!type.isDefault && (
                  <button onClick={() => handleRemove(type.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      )}

      {showNew ? (
        <ArticleTypeEditor
          onSave={handleAdd}
          onCancel={() => setShowNew(false)}
        />
      ) : (
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 px-4 py-4 text-sm text-gray-400 hover:border-gray-300 hover:text-gray-600 w-full justify-center transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Article Type
        </button>
      )}
    </div>
  );
}

function ArticleTypeEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: ArticleType;
  onSave: (type: ArticleType) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [draftPrompt, setDraftPrompt] = useState(initial?.draftPrompt ?? '');
  const [structurePrompt, setStructurePrompt] = useState(initial?.structurePrompt ?? '');

  function handleSubmit() {
    if (!name.trim() || !draftPrompt.trim() || !structurePrompt.trim()) {
      toast.error('All fields are required');
      return;
    }
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      draftPrompt: draftPrompt.trim(),
      structurePrompt: structurePrompt.trim(),
      isDefault: initial?.isDefault,
    });
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-md p-5 space-y-4">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Article type name (e.g., Screen Overview)"
        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-medium focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
      />
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">
          Draft Prompt (Agent 2 — creates initial draft from transcript)
        </label>
        <textarea
          value={draftPrompt}
          onChange={(e) => setDraftPrompt(e.target.value)}
          rows={6}
          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-mono focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">
          Structure Prompt (Agent 3 — formats draft into structured article)
        </label>
        <textarea
          value={structurePrompt}
          onChange={(e) => setStructurePrompt(e.target.value)}
          rows={6}
          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-mono focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  );
}

// ── Platform Profiles Tab ────────────────────────────────

function PlatformProfilesTab() {
  const [profiles, setProfiles] = useState<PlatformProfile[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const data = await getPlatformProfiles(supabase);
      setProfiles(data);
    })();
  }, []);

  async function handleSave(profile: PlatformProfile) {
    await updatePlatformProfile(supabase, profile.id, {
      name: profile.name,
      htmlPrompt: profile.htmlPrompt,
      htmlTemplate: profile.htmlTemplate,
    });
    setProfiles((prev) => prev.map((p) => (p.id === profile.id ? profile : p)));
    setEditing(null);
    toast.success('Platform profile updated');
  }

  async function handleAdd(profile: PlatformProfile) {
    await addPlatformProfile(supabase, profile);
    const data = await getPlatformProfiles(supabase);
    setProfiles(data);
    setShowNew(false);
    toast.success('Platform profile added');
  }

  async function handleRemove(id: string) {
    await deletePlatformProfile(supabase, id);
    const data = await getPlatformProfiles(supabase);
    setProfiles(data);
    toast.success('Platform profile removed');
  }

  return (
    <div className="space-y-3">
      {profiles.map((profile) =>
        editing === profile.id ? (
          <PlatformProfileEditor
            key={profile.id}
            initial={profile}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <div key={profile.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">{profile.name}</h3>
                <p className="text-xs text-gray-400">
                  {profile.isDefault ? 'Default preset' : 'Custom'}
                  {profile.htmlTemplate ? ` · ${(profile.htmlTemplate.length / 1024).toFixed(1)}KB template` : ' · No template'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setEditing(profile.id)} className="text-gray-300 hover:text-gray-900 transition-colors">
                  <Pencil className="h-4 w-4" />
                </button>
                {!profile.isDefault && (
                  <button onClick={() => handleRemove(profile.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      )}

      {showNew ? (
        <PlatformProfileEditor
          onSave={handleAdd}
          onCancel={() => setShowNew(false)}
        />
      ) : (
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 px-4 py-4 text-sm text-gray-400 hover:border-gray-300 hover:text-gray-600 w-full justify-center transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Platform Profile
        </button>
      )}
    </div>
  );
}

function PlatformProfileEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: PlatformProfile;
  onSave: (profile: PlatformProfile) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [htmlPrompt, setHtmlPrompt] = useState(initial?.htmlPrompt ?? '');
  const [htmlTemplate, setHtmlTemplate] = useState(initial?.htmlTemplate ?? '');
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);

  async function handleScrapeTemplate() {
    if (!scrapeUrl.trim()) return;
    setIsScraping(true);
    try {
      const res = await fetch('/api/scrape-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scrapeUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setHtmlTemplate(data.html);
      toast.success('Template HTML extracted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to scrape template');
    } finally {
      setIsScraping(false);
    }
  }

  function handleSubmit() {
    if (!name.trim() || !htmlPrompt.trim()) {
      toast.error('Name and HTML prompt are required');
      return;
    }
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      htmlPrompt: htmlPrompt.trim(),
      htmlTemplate: htmlTemplate.trim(),
      isDefault: initial?.isDefault,
    });
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-md p-5 space-y-4">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Platform name (e.g., HelpJuice, Zendesk)"
        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-medium focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
      />
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">
          HTML Prompt (Agent 4 — converts article to platform HTML)
        </label>
        <textarea
          value={htmlPrompt}
          onChange={(e) => setHtmlPrompt(e.target.value)}
          rows={6}
          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-mono focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">
          HTML Template Reference (paste or scrape from URL)
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="url"
            value={scrapeUrl}
            onChange={(e) => setScrapeUrl(e.target.value)}
            placeholder="Paste URL of existing KB article to extract template..."
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
          />
          <button
            onClick={handleScrapeTemplate}
            disabled={isScraping || !scrapeUrl.trim()}
            className={cn(
              'rounded-xl px-4 py-3 text-sm font-medium text-white whitespace-nowrap transition-all',
              isScraping || !scrapeUrl.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-black hover:bg-gray-800'
            )}
          >
            {isScraping ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Extract'}
          </button>
        </div>
        <textarea
          value={htmlTemplate}
          onChange={(e) => setHtmlTemplate(e.target.value)}
          rows={8}
          placeholder="Paste HTML template code here, or use the URL scraper above..."
          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-mono focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  );
}
