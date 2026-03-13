'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Pencil, Globe, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/utils/cn';
import type { CompanyContext, ArticleType, PlatformProfile } from '@/types';
import {
  getCompanyContext, saveCompanyContext, deleteCompanyContext,
  getArticleTypes, saveArticleTypes, addArticleType, deleteArticleType,
  getPlatformProfiles, savePlatformProfiles, addPlatformProfile, deletePlatformProfile,
  seedDefaults,
} from '@/lib/storage';

type Tab = 'context' | 'article-types' | 'platforms';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('context');

  useEffect(() => { seedDefaults(); }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="mt-1 text-gray-500">Configure your article generation pipeline</p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Generate Article <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {[
            { id: 'context' as Tab, label: 'Company Context', icon: Globe },
            { id: 'article-types' as Tab, label: 'Article Types', icon: FileText },
            { id: 'platforms' as Tab, label: 'Platform Profiles', icon: FileText },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <Icon className="h-4 w-4" />
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

  useEffect(() => {
    setContext(getCompanyContext());
  }, []);

  async function handleScrapeUrl() {
    if (!url.trim()) return;
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
      saveCompanyContext(newContext);
      setContext(newContext);
      toast.success('Company context extracted successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to extract context');
    } finally {
      setIsLoading(false);
    }
  }

  function handleSaveManual() {
    if (!manualText.trim()) return;
    const newContext: CompanyContext = {
      id: crypto.randomUUID(),
      name: 'My Company',
      description: manualText.trim(),
      createdAt: new Date().toISOString(),
    };
    saveCompanyContext(newContext);
    setContext(newContext);
    toast.success('Company context saved');
  }

  function handleDelete() {
    deleteCompanyContext();
    setContext(null);
    toast.success('Company context removed');
  }

  function handleUpdateField(field: keyof CompanyContext, value: string) {
    if (!context) return;
    const updated = { ...context, [field]: value };
    saveCompanyContext(updated);
    setContext(updated);
  }

  if (context) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Current Company Context</h3>
            <button onClick={handleDelete} className="text-red-500 hover:text-red-700">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                value={context.name}
                onChange={(e) => handleUpdateField('name', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={context.description}
                onChange={(e) => handleUpdateField('description', e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                <input
                  type="text"
                  value={context.industry ?? ''}
                  onChange={(e) => handleUpdateField('industry', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                <input
                  type="text"
                  value={context.targetAudience ?? ''}
                  onChange={(e) => handleUpdateField('targetAudience', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Company Context</h3>
        <p className="text-sm text-gray-500 mb-4">
          Provide information about your company so articles are tailored to your product, audience, and terminology.
        </p>

        <div className="flex rounded-lg border border-gray-300 p-1 mb-4">
          <button
            onClick={() => setMode('url')}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              mode === 'url' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            From Website URL
          </button>
          <button
            onClick={() => setMode('manual')}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              mode === 'manual' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              onClick={handleScrapeUrl}
              disabled={isLoading || !url.trim()}
              className={cn(
                'w-full rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors',
                isLoading || !url.trim() ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              onClick={handleSaveManual}
              disabled={!manualText.trim()}
              className={cn(
                'w-full rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors',
                !manualText.trim() ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'
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

  useEffect(() => {
    setTypes(getArticleTypes());
  }, []);

  function handleSave(type: ArticleType) {
    const updated = types.map((t) => (t.id === type.id ? type : t));
    saveArticleTypes(updated);
    setTypes(updated);
    setEditing(null);
    toast.success('Article type updated');
  }

  function handleAdd(type: ArticleType) {
    addArticleType(type);
    setTypes(getArticleTypes());
    setShowNew(false);
    toast.success('Article type added');
  }

  function handleRemove(id: string) {
    deleteArticleType(id);
    setTypes(getArticleTypes());
    toast.success('Article type removed');
  }

  return (
    <div className="space-y-4">
      {types.map((type) =>
        editing === type.id ? (
          <ArticleTypeEditor
            key={type.id}
            initial={type}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <div key={type.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{type.name}</h3>
                {type.isDefault && (
                  <span className="text-xs text-gray-400">Default preset</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setEditing(type.id)} className="text-gray-500 hover:text-blue-600">
                  <Pencil className="h-4 w-4" />
                </button>
                {!type.isDefault && (
                  <button onClick={() => handleRemove(type.id)} className="text-gray-500 hover:text-red-600">
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
          className="flex items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 w-full justify-center"
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
    <div className="rounded-lg border-2 border-blue-200 bg-white p-4 space-y-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Article type name (e.g., Screen Overview)"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium"
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Draft Prompt (Agent 2 — creates initial draft from transcript)
        </label>
        <textarea
          value={draftPrompt}
          onChange={(e) => setDraftPrompt(e.target.value)}
          rows={6}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Structure Prompt (Agent 3 — formats draft into structured article)
        </label>
        <textarea
          value={structurePrompt}
          onChange={(e) => setStructurePrompt(e.target.value)}
          rows={6}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
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

  useEffect(() => {
    setProfiles(getPlatformProfiles());
  }, []);

  function handleSave(profile: PlatformProfile) {
    const updated = profiles.map((p) => (p.id === profile.id ? profile : p));
    savePlatformProfiles(updated);
    setProfiles(updated);
    setEditing(null);
    toast.success('Platform profile updated');
  }

  function handleAdd(profile: PlatformProfile) {
    addPlatformProfile(profile);
    setProfiles(getPlatformProfiles());
    setShowNew(false);
    toast.success('Platform profile added');
  }

  function handleRemove(id: string) {
    deletePlatformProfile(id);
    setProfiles(getPlatformProfiles());
    toast.success('Platform profile removed');
  }

  return (
    <div className="space-y-4">
      {profiles.map((profile) =>
        editing === profile.id ? (
          <PlatformProfileEditor
            key={profile.id}
            initial={profile}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <div key={profile.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{profile.name}</h3>
                <p className="text-xs text-gray-400">
                  {profile.isDefault ? 'Default preset' : 'Custom'}
                  {profile.htmlTemplate ? ` · ${(profile.htmlTemplate.length / 1024).toFixed(1)}KB template` : ' · No template'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setEditing(profile.id)} className="text-gray-500 hover:text-blue-600">
                  <Pencil className="h-4 w-4" />
                </button>
                {!profile.isDefault && (
                  <button onClick={() => handleRemove(profile.id)} className="text-gray-500 hover:text-red-600">
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
          className="flex items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 w-full justify-center"
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
    <div className="rounded-lg border-2 border-blue-200 bg-white p-4 space-y-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Platform name (e.g., HelpJuice, Zendesk)"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium"
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          HTML Prompt (Agent 4 — converts article to platform HTML)
        </label>
        <textarea
          value={htmlPrompt}
          onChange={(e) => setHtmlPrompt(e.target.value)}
          rows={6}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          HTML Template Reference (paste or scrape from URL)
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="url"
            value={scrapeUrl}
            onChange={(e) => setScrapeUrl(e.target.value)}
            placeholder="Paste URL of existing KB article to extract template..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            onClick={handleScrapeTemplate}
            disabled={isScraping || !scrapeUrl.trim()}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-medium text-white whitespace-nowrap',
              isScraping || !scrapeUrl.trim() ? 'bg-gray-300' : 'bg-green-600 hover:bg-green-700'
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
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Save
        </button>
      </div>
    </div>
  );
}
