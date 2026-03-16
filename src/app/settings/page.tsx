'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Pencil, Globe, FileText, ArrowRight, Download, AlertTriangle, User, Key, Copy, Check, Eye, EyeOff, Palette, ChevronDown, ChevronUp, Sparkles, Link2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/utils/cn';
import type { ArticleType, PlatformProfile, WorkspaceBranding, ArticleTypeControls } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { useWorkspace } from '@/contexts/workspace-context';
import {
  updateWorkspace,
  getArticleTypes, addArticleType, updateArticleType, deleteArticleType,
  getPlatformProfiles, addPlatformProfile, updatePlatformProfile, deletePlatformProfile,
} from '@/lib/supabase/queries';

type Tab = 'context' | 'branding' | 'article-types' | 'platforms' | 'api' | 'account';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('context');

  const tabs: { id: Tab; label: string; icon: typeof Globe }[] = [
    { id: 'context', label: 'Company Context', icon: Globe },
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'article-types', label: 'Article Types', icon: FileText },
    { id: 'platforms', label: 'Platforms', icon: FileText },
    { id: 'api', label: 'API', icon: Key },
    { id: 'account', label: 'Account', icon: User },
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Settings</h1>
            <p className="text-xs text-gray-400 mt-1">Configure your article generation pipeline</p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:from-violet-700 hover:to-blue-600 transition-all"
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
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'context' && <CompanyContextTab />}
        {activeTab === 'branding' && <BrandingTab />}
        {activeTab === 'article-types' && <ArticleTypesTab />}
        {activeTab === 'platforms' && <PlatformProfilesTab />}
        {activeTab === 'api' && <ApiKeysTab />}
        {activeTab === 'account' && <AccountTab />}
      </div>
    </div>
  );
}

// ── Company Context Tab (workspace-scoped) ──────────────

function CompanyContextTab() {
  const { activeWorkspace, refreshWorkspaces } = useWorkspace();
  const [url, setUrl] = useState('');
  const [manualText, setManualText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'url' | 'manual'>('url');

  const supabase = createClient();

  const hasContext = !!(activeWorkspace?.companyName || activeWorkspace?.companyDescription);

  async function handleScrapeUrl() {
    if (!url.trim() || !activeWorkspace) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/scrape-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await updateWorkspace(supabase, activeWorkspace.id, {
        companyName: data.name,
        companyDescription: data.description,
        industry: data.industry,
        targetAudience: data.targetAudience,
        ...(data.branding && Object.keys(data.branding).length > 0 ? { branding: { ...activeWorkspace.branding, ...data.branding } } : {}),
      });
      await refreshWorkspaces();
      toast.success(data.branding ? 'Company context & branding extracted' : 'Company context extracted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to extract context');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveManual() {
    if (!manualText.trim() || !activeWorkspace) return;
    await updateWorkspace(supabase, activeWorkspace.id, {
      companyName: activeWorkspace.name,
      companyDescription: manualText.trim(),
    });
    await refreshWorkspaces();
    toast.success('Company context saved');
  }

  async function handleClearContext() {
    if (!activeWorkspace) return;
    await updateWorkspace(supabase, activeWorkspace.id, {
      companyName: '',
      companyDescription: '',
      industry: '',
      targetAudience: '',
    });
    await refreshWorkspaces();
    toast.success('Company context cleared');
  }

  async function handleUpdateField(field: 'companyName' | 'companyDescription' | 'industry' | 'targetAudience', value: string) {
    if (!activeWorkspace) return;
    await updateWorkspace(supabase, activeWorkspace.id, { [field]: value });
    await refreshWorkspaces();
  }

  if (!activeWorkspace) return null;

  if (hasContext) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold tracking-tight text-gray-900">Company Context — {activeWorkspace.name}</h3>
            <button onClick={handleClearContext} className="text-gray-300 hover:text-red-400 transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Company Name</label>
              <input
                type="text"
                value={activeWorkspace.companyName ?? ''}
                onChange={(e) => handleUpdateField('companyName', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Description</label>
              <textarea
                value={activeWorkspace.companyDescription ?? ''}
                onChange={(e) => handleUpdateField('companyDescription', e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Industry</label>
                <input
                  type="text"
                  value={activeWorkspace.industry ?? ''}
                  onChange={(e) => handleUpdateField('industry', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Target Audience</label>
                <input
                  type="text"
                  value={activeWorkspace.targetAudience ?? ''}
                  onChange={(e) => handleUpdateField('targetAudience', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
                />
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400">This context is injected into article generation to tailor content for this workspace.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
        <h3 className="text-lg font-semibold tracking-tight text-gray-900 mb-2">Add Company Context — {activeWorkspace.name}</h3>
        <p className="text-xs text-gray-400 mb-5">
          Provide information about your company so articles are tailored to your product, audience, and terminology.
        </p>

        <div className="bg-gray-100 rounded-full p-1 flex mb-5">
          <button
            onClick={() => setMode('url')}
            className={cn(
              'flex-1 rounded-full px-3 py-2 text-sm font-medium transition-all',
              mode === 'url' ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            From Website URL
          </button>
          <button
            onClick={() => setMode('manual')}
            className={cn(
              'flex-1 rounded-full px-3 py-2 text-sm font-medium transition-all',
              mode === 'manual' ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
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
                isLoading || !url.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600'
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
                !manualText.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600'
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

// ── Branding Tab ─────────────────────────────────────────

function BrandingTab() {
  const { activeWorkspace, refreshWorkspaces } = useWorkspace();
  const supabase = createClient();
  const [branding, setBranding] = useState<WorkspaceBranding>({});
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [brandUrl, setBrandUrl] = useState('');

  useEffect(() => {
    if (activeWorkspace?.branding) {
      setBranding(activeWorkspace.branding);
    }
  }, [activeWorkspace?.id, activeWorkspace?.branding]);

  async function handleSave() {
    if (!activeWorkspace) return;
    setSaving(true);
    try {
      await updateWorkspace(supabase, activeWorkspace.id, { branding });
      await refreshWorkspaces();
      toast.success('Branding saved');
    } catch {
      toast.error('Failed to save branding');
    } finally {
      setSaving(false);
    }
  }

  async function handleExtractFromUrl() {
    if (!brandUrl.trim() || !activeWorkspace) return;
    setExtracting(true);
    try {
      const res = await fetch('/api/scrape-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: brandUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.branding) {
        const merged = { ...branding, ...data.branding };
        setBranding(merged);
        toast.success('Brand colors extracted from website');
      } else {
        toast.error('Could not detect brand colors from this URL');
      }
    } catch {
      toast.error('Failed to extract branding');
    } finally {
      setExtracting(false);
    }
  }

  function updateColor(key: keyof WorkspaceBranding, value: string) {
    setBranding((prev) => ({ ...prev, [key]: value }));
  }

  if (!activeWorkspace) return null;

  return (
    <div className="space-y-6">
      {/* Auto-extract */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
        <h3 className="text-lg font-semibold tracking-tight text-gray-900 mb-2">Extract from Website</h3>
        <p className="text-xs text-gray-400 mb-4">Automatically detect your brand colors and font from your website.</p>
        <div className="flex gap-2">
          <input
            type="url"
            value={brandUrl}
            onChange={(e) => setBrandUrl(e.target.value)}
            placeholder="https://your-company.com"
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
          />
          <button
            onClick={handleExtractFromUrl}
            disabled={extracting || !brandUrl.trim()}
            className={cn(
              'rounded-xl px-4 py-3 text-sm font-medium text-white transition-all whitespace-nowrap',
              extracting || !brandUrl.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600'
            )}
          >
            {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Detect'}
          </button>
        </div>
      </div>

      {/* Color pickers */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
        <h3 className="text-lg font-semibold tracking-tight text-gray-900 mb-4">Brand Colors</h3>
        <div className="grid grid-cols-3 gap-4">
          <ColorField label="Primary Color" value={branding.primaryColor ?? '#6d28d9'} onChange={(v) => updateColor('primaryColor', v)} />
          <ColorField label="Secondary Color" value={branding.secondaryColor ?? '#3b82f6'} onChange={(v) => updateColor('secondaryColor', v)} />
          <ColorField label="Accent Color" value={branding.accentColor ?? '#f59e0b'} onChange={(v) => updateColor('accentColor', v)} />
        </div>

        {/* Preview strip */}
        <div className="mt-4 flex gap-2 items-center">
          <span className="text-xs text-gray-400">Preview:</span>
          <div className="flex gap-1.5">
            <div className="w-10 h-10 rounded-lg shadow-sm border border-gray-100" style={{ backgroundColor: branding.primaryColor ?? '#6d28d9' }} />
            <div className="w-10 h-10 rounded-lg shadow-sm border border-gray-100" style={{ backgroundColor: branding.secondaryColor ?? '#3b82f6' }} />
            <div className="w-10 h-10 rounded-lg shadow-sm border border-gray-100" style={{ backgroundColor: branding.accentColor ?? '#f59e0b' }} />
          </div>
        </div>
      </div>

      {/* Font & Logo */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 space-y-4">
        <h3 className="text-lg font-semibold tracking-tight text-gray-900 mb-2">Typography & Logo</h3>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Font Family</label>
          <select
            value={branding.fontFamily ?? 'Inter'}
            onChange={(e) => updateColor('fontFamily', e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
          >
            {['Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Montserrat', 'Source Sans Pro', 'Nunito', 'Raleway', 'PT Sans'].map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Logo URL (optional)</label>
          <input
            type="url"
            value={branding.logoUrl ?? ''}
            onChange={(e) => updateColor('logoUrl', e.target.value)}
            placeholder="https://your-company.com/logo.png"
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
          />
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={cn(
          'w-full rounded-xl px-4 py-3 text-sm font-medium text-white transition-all',
          saving ? 'bg-gray-300 cursor-not-allowed' : 'bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600'
        )}
      >
        {saving ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving...</span> : 'Save Branding'}
      </button>

      <p className="text-xs text-gray-400">Branding colors and font are automatically applied when generating HTML articles for this workspace.</p>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm font-mono focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
        />
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

const TONE_OPTIONS = ['formal', 'casual', 'technical', 'friendly'] as const;
const LENGTH_OPTIONS = ['concise', 'standard', 'detailed'] as const;
const STRUCTURE_OPTIONS = ['step-by-step', 'narrative', 'faq-heavy', 'reference'] as const;
const AUDIENCE_OPTIONS = ['end-users', 'developers', 'managers', 'mixed'] as const;

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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [controls, setControls] = useState<ArticleTypeControls>({
    tone: 'formal',
    length: 'standard',
    structure: 'step-by-step',
    audience: 'end-users',
  });
  const [importUrl, setImportUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [importSummary, setImportSummary] = useState('');

  async function handleImportFromExample() {
    if (!importUrl.trim()) return;
    setAnalyzing(true);
    setImportSummary('');
    try {
      const res = await fetch('/api/analyze-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.controls) {
        setControls(data.controls);
      }
      if (data.draftPrompt) setDraftPrompt(data.draftPrompt);
      if (data.structurePrompt) setStructurePrompt(data.structurePrompt);
      if (data.summary) setImportSummary(data.summary);
      if (!name.trim()) setName('Imported Style');
      toast.success('Style imported from example article');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to analyze article');
    } finally {
      setAnalyzing(false);
    }
  }

  function handleSubmit() {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    // If no advanced prompts, generate from controls
    let finalDraft = draftPrompt.trim();
    let finalStructure = structurePrompt.trim();
    if (!finalDraft) {
      finalDraft = `You are a knowledge base article writer. Write in a ${controls.tone} tone. Target audience: ${controls.audience}. Length: ${controls.length}. Create a comprehensive draft article from the provided transcript.`;
    }
    if (!finalStructure) {
      finalStructure = `You are a knowledge base article editor. Structure the article as a ${controls.structure} guide. Tone: ${controls.tone}. Target audience: ${controls.audience}. Length: ${controls.length}. Format the draft into a well-structured article.`;
    }
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      draftPrompt: finalDraft,
      structurePrompt: finalStructure,
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

      {/* Import from example */}
      <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/50 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-violet-700">
          <Sparkles className="h-4 w-4" />
          Import Style from Example Article
        </div>
        <p className="text-xs text-gray-500">Paste a URL to a public KB article and we&apos;ll mimic its exact tone, structure, and formatting.</p>
        <div className="flex gap-2">
          <input
            type="url"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            placeholder="https://help.example.com/article/..."
            className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100 transition-all"
          />
          <button
            onClick={handleImportFromExample}
            disabled={analyzing || !importUrl.trim()}
            className={cn(
              'rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all whitespace-nowrap',
              analyzing || !importUrl.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-700'
            )}
          >
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Analyze'}
          </button>
        </div>
        {importSummary && (
          <p className="text-xs text-violet-600 bg-violet-100 rounded-lg px-3 py-2">{importSummary}</p>
        )}
      </div>

      {/* Simple controls */}
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Tone" value={controls.tone ?? 'formal'} options={TONE_OPTIONS} onChange={(v) => setControls({ ...controls, tone: v as ArticleTypeControls['tone'] })} />
        <SelectField label="Length" value={controls.length ?? 'standard'} options={LENGTH_OPTIONS} onChange={(v) => setControls({ ...controls, length: v as ArticleTypeControls['length'] })} />
        <SelectField label="Structure" value={controls.structure ?? 'step-by-step'} options={STRUCTURE_OPTIONS} onChange={(v) => setControls({ ...controls, structure: v as ArticleTypeControls['structure'] })} />
        <SelectField label="Target Audience" value={controls.audience ?? 'end-users'} options={AUDIENCE_OPTIONS} onChange={(v) => setControls({ ...controls, audience: v as ArticleTypeControls['audience'] })} />
      </div>

      {/* Advanced toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        Advanced — Edit Prompts Directly
      </button>

      {showAdvanced && (
        <div className="space-y-4 border-t border-gray-100 pt-4">
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
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="rounded-xl bg-gradient-to-r from-violet-600 to-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:from-violet-700 hover:to-blue-600 transition-all"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm capitalize focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
      >
        {options.map((o) => (
          <option key={o} value={o} className="capitalize">{o.replace(/-/g, ' ')}</option>
        ))}
      </select>
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
        body: JSON.stringify({ url: scrapeUrl, analyze: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Smart analysis: auto-fill prompt, template, and name
      if (data.htmlPrompt) setHtmlPrompt(data.htmlPrompt);
      if (data.htmlTemplate) setHtmlTemplate(data.htmlTemplate);
      if (data.platformName && !name.trim()) setName(data.platformName);

      toast.success(
        data.htmlPrompt
          ? `Analyzed! Detected "${data.platformName}" — CSS classes and components extracted`
          : 'Template HTML extracted (raw)'
      );
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
          Import from existing article (auto-detects platform, CSS classes &amp; components)
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="url"
            value={scrapeUrl}
            onChange={(e) => setScrapeUrl(e.target.value)}
            placeholder="Paste URL of any KB article to auto-detect its platform format..."
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
          />
          <button
            onClick={handleScrapeTemplate}
            disabled={isScraping || !scrapeUrl.trim()}
            className={cn(
              'rounded-xl px-4 py-3 text-sm font-medium text-white whitespace-nowrap transition-all',
              isScraping || !scrapeUrl.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600'
            )}
          >
            {isScraping ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Analyzing...
              </span>
            ) : 'Analyze & Import'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          AI will identify the platform, extract CSS classes, and generate both the prompt and template automatically.
        </p>
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
          className="rounded-xl bg-gradient-to-r from-violet-600 to-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:from-violet-700 hover:to-blue-600 transition-all"
        >
          Save
        </button>
      </div>
    </div>
  );
}

// ── API Keys Tab ──────────────────────────────────────────

interface ApiKeyInfo {
  id: string;
  key_prefix: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
}

function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    try {
      const res = await fetch('/api/api-keys');
      const data = await res.json();
      if (data.keys) setKeys(data.keys);
    } catch {
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
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

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app';

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
              {showKey ? newKey : newKey.slice(0, 12) + '•'.repeat(36)}
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
                  <code className="text-sm font-mono text-gray-600">{k.key_prefix}{'•'.repeat(12)}</code>
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
            <span className="text-white text-sm font-bold">⚡</span>
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

// ── Account Tab ───────────────────────────────────────────

function AccountTab() {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const router = useRouter();

  const isDeleteConfirmed = confirmText === 'DELETE';

  async function handleExport() {
    setIsExporting(true);
    try {
      const res = await fetch('/api/account/export');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Export failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kbpipe-data-export.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDelete() {
    if (!isDeleteConfirmed) return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Deletion failed');
      }
      toast.success('Account deleted successfully');
      router.push('/login');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete account');
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Export Data */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
        <div className="flex items-center gap-3 mb-2">
          <Download className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-semibold tracking-tight text-gray-900">Export My Data</h3>
        </div>
        <p className="text-xs text-gray-400 mb-5">
          Download a copy of all your data including articles, company context, and preferences as a JSON file.
        </p>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all',
            isExporting ? 'bg-gray-300 cursor-not-allowed' : 'bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600'
          )}
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" /> Export Data
            </>
          )}
        </button>
      </div>

      {/* Delete Account */}
      <div className="rounded-2xl border border-red-100 bg-white shadow-sm p-6">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h3 className="text-lg font-semibold tracking-tight text-red-600">Delete My Account</h3>
        </div>
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 mb-5">
          <p className="text-sm text-red-700">
            This action is permanent and cannot be undone. All your data will be permanently deleted, including:
          </p>
          <ul className="text-sm text-red-600 mt-2 list-disc list-inside space-y-1">
            <li>All generated articles</li>
            <li>Company context and preferences</li>
            <li>Your user account</li>
          </ul>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Type <span className="font-mono text-red-500">DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="w-full max-w-xs rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-mono focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100 transition-all"
          />
        </div>

        <button
          onClick={handleDelete}
          disabled={!isDeleteConfirmed || isDeleting}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all',
            !isDeleteConfirmed || isDeleting
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-red-500 hover:bg-red-600'
          )}
        >
          {isDeleting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Deleting account...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4" /> Permanently Delete Account
            </>
          )}
        </button>
      </div>
    </div>
  );
}
