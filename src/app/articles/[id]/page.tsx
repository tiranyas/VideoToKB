'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Copy, Check, FileDown, Trash2, ArrowLeft, Pencil, Code, Loader2, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getArticle, deleteArticle, updateArticleTitle, updateArticleHtml, getPlatformProfiles } from '@/lib/supabase/queries';
import { cn } from '@/utils/cn';
import type { Article, PlatformProfile } from '@/types';

type Tab = 'markdown' | 'html' | 'preview';

export default function ArticleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('markdown');
  const [copied, setCopied] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Editing state
  const [markdownDraft, setMarkdownDraft] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // HTML generation state
  const [platforms, setPlatforms] = useState<PlatformProfile[]>([]);
  const [selectedPlatformId, setSelectedPlatformId] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const [data, profs] = await Promise.all([
        getArticle(supabase, id, user.id),
        getPlatformProfiles(supabase),
      ]);
      setArticle(data);
      setPlatforms(profs);
      if (data) {
        setMarkdownDraft(data.markdown);
        setSelectedPlatformId(data.platformId ?? profs[0]?.id ?? '');
      }
      setLoading(false);
      if (data?.html) setTab('preview');
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (tab === 'preview' && iframeRef.current && article?.html) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(article.html);
        doc.close();
      }
    }
  }, [tab, article?.html]);

  function handleMarkdownChange(value: string) {
    setMarkdownDraft(value);
    setHasUnsavedChanges(value !== article?.markdown);
  }

  async function handleSaveMarkdown() {
    if (!article || !userId || !hasUnsavedChanges) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('articles')
        .update({ markdown: markdownDraft })
        .eq('id', article.id)
        .eq('user_id', userId);
      if (error) throw error;
      setArticle({ ...article, markdown: markdownDraft });
      setHasUnsavedChanges(false);
      toast.success('Article saved');
    } catch {
      toast.error('Failed to save');
    }
    setSaving(false);
  }

  async function handleCopy() {
    const text = tab === 'markdown' ? markdownDraft : (article?.html ?? '');
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDownloadWord() {
    if (!article) return;
    try {
      const { generateWordDoc } = await import('@/lib/word-export');
      const blob = await generateWordDoc(markdownDraft);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${article.title}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Word file downloaded');
    } catch {
      toast.error('Failed to generate Word file');
    }
  }

  const handleGenerateHTML = useCallback(async () => {
    if (!article || !userId) return;
    const platform = platforms.find(p => p.id === selectedPlatformId);
    if (!platform) {
      toast.error('Please select a platform profile');
      return;
    }

    if (platform.id === 'markdown-only' || (!platform.htmlTemplate && !platform.htmlPrompt)) {
      toast.info('This platform uses Markdown only — no HTML conversion needed');
      return;
    }

    // Save any pending markdown changes first
    if (hasUnsavedChanges) {
      const { error } = await supabase
        .from('articles')
        .update({ markdown: markdownDraft })
        .eq('id', article.id)
        .eq('user_id', userId);
      if (!error) {
        setArticle({ ...article, markdown: markdownDraft });
        setHasUnsavedChanges(false);
      }
    }

    setGenerating(true);
    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase: 'html',
          article: markdownDraft,
          htmlPrompt: platform.htmlPrompt,
          htmlTemplate: platform.htmlTemplate,
        }),
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';
      let resultHtml = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          for (const line of part.split('\n')) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6));
                if (event.step === 'done' && event.html) {
                  resultHtml = event.html;
                } else if (event.step === 'error') {
                  throw new Error(event.message ?? 'Generation failed');
                }
              } catch (e) {
                if (e instanceof Error && e.message !== 'Generation failed') continue;
                throw e;
              }
            }
          }
        }
      }

      if (resultHtml) {
        await updateArticleHtml(supabase, article.id, resultHtml, userId);
        setArticle({ ...article, markdown: markdownDraft, html: resultHtml });
        setTab('preview');
        toast.success('HTML generated successfully');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate HTML');
    }
    setGenerating(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article, userId, platforms, selectedPlatformId, markdownDraft, hasUnsavedChanges]);

  async function handleTitleSave() {
    if (!article || !titleDraft.trim() || titleDraft.trim() === article.title) {
      setEditingTitle(false);
      return;
    }
    try {
      await updateArticleTitle(supabase, article.id, titleDraft.trim(), userId!);
      setArticle({ ...article, title: titleDraft.trim() });
      toast.success('Title updated');
    } catch {
      toast.error('Failed to update title');
    }
    setEditingTitle(false);
  }

  async function handleDelete() {
    if (!article) return;
    await deleteArticle(supabase, article.id, userId!);
    toast.success('Article deleted');
    router.push('/articles');
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-400">Loading article...</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-sm text-gray-400">Article not found.</p>
        <Link href="/articles" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
          Back to Articles
        </Link>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: 'markdown', label: 'Markdown', show: true },
    { id: 'preview', label: 'Preview', show: !!article.html },
    { id: 'html', label: 'HTML', show: !!article.html },
  ];

  const selectedPlatform = platforms.find(p => p.id === selectedPlatformId);
  const canGenerateHtml = selectedPlatform && selectedPlatform.id !== 'markdown-only' && (selectedPlatform.htmlTemplate || selectedPlatform.htmlPrompt);

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex-1 min-w-0">
            <Link
              href="/articles"
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-900 transition-colors mb-3"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Articles
            </Link>
            {editingTitle ? (
              <form
                onSubmit={(e) => { e.preventDefault(); handleTitleSave(); }}
              >
                <input
                  ref={titleInputRef}
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={(e) => { if (e.key === 'Escape') setEditingTitle(false); }}
                  autoFocus
                  className="text-2xl font-semibold tracking-tight text-gray-900 border-b-2 border-gray-900 bg-transparent outline-none w-full"
                />
              </form>
            ) : (
              <button
                onClick={() => { setTitleDraft(article.title); setEditingTitle(true); }}
                className="group flex items-center gap-2.5 text-left"
                title="Click to edit title"
              >
                <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{article.title}</h1>
                <Pencil className="h-3.5 w-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
            <p className="text-xs text-gray-400 mt-1.5">
              {article.sourceType} · {new Date(article.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={handleDelete}
            className="ml-4 text-gray-300 hover:text-red-400 transition-colors"
            title="Delete article"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs + Actions */}
        <div className="flex items-center justify-between mb-5">
          <div className="bg-gray-100 rounded-full p-1 flex">
            {tabs.filter(t => t.show).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium transition-all',
                  tab === t.id
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {tab === 'markdown' && hasUnsavedChanges && (
              <button
                onClick={handleSaveMarkdown}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </button>
            )}
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
            >
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            {tab === 'markdown' && (
              <button
                onClick={handleDownloadWord}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
              >
                <FileDown className="h-4 w-4" /> Word
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {tab === 'preview' ? (
          <>
            <p className="text-xs text-gray-400 mb-2">
              This is a generic preview. Images and layout may appear differently in your KB platform (e.g. HelpJuice).
            </p>
            <iframe
              ref={iframeRef}
              title="Article Preview"
              className="w-full min-h-[500px] rounded-2xl border border-gray-200 bg-white"
              sandbox="allow-same-origin"
            />
          </>
        ) : tab === 'html' ? (
          <textarea
            readOnly
            value={article.html ?? ''}
            className="w-full min-h-[500px] rounded-2xl border border-gray-200 bg-gray-50/30 px-4 py-3 font-mono text-sm leading-relaxed focus:outline-none"
          />
        ) : (
          <textarea
            value={markdownDraft}
            onChange={(e) => handleMarkdownChange(e.target.value)}
            className="w-full min-h-[500px] rounded-2xl border border-gray-200 bg-gray-50/30 px-4 py-3 font-mono text-sm leading-relaxed focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
            placeholder="Edit your article here..."
          />
        )}

        {/* Generate HTML Section */}
        {tab === 'markdown' && (
          <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {article.html ? 'Regenerate HTML' : 'Generate HTML'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {article.html
                    ? 'Re-convert the markdown to platform HTML with your latest edits'
                    : 'Convert the markdown article to your platform\'s HTML format'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={selectedPlatformId}
                  onChange={(e) => setSelectedPlatformId(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-200"
                >
                  {platforms.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleGenerateHTML}
                  disabled={generating || !canGenerateHtml}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all',
                    generating || !canGenerateHtml
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600'
                  )}
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Code className="h-4 w-4" />
                      {article.html ? 'Regenerate' : 'Generate HTML'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
