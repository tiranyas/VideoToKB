'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Copy, Check, FileDown, Trash2, ArrowLeft, Pencil } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getArticle, deleteArticle, updateArticleTitle } from '@/lib/supabase/queries';
import { cn } from '@/utils/cn';
import type { Article } from '@/types';

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
  const titleInputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    (async () => {
      const data = await getArticle(supabase, id);
      setArticle(data);
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

  async function handleCopy() {
    const text = tab === 'markdown' ? article?.markdown : (article?.html ?? '');
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
      const blob = await generateWordDoc(article.markdown);
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

  async function handleTitleSave() {
    if (!article || !titleDraft.trim() || titleDraft.trim() === article.title) {
      setEditingTitle(false);
      return;
    }
    try {
      await updateArticleTitle(supabase, article.id, titleDraft.trim());
      setArticle({ ...article, title: titleDraft.trim() });
      toast.success('Title updated');
    } catch {
      toast.error('Failed to update title');
    }
    setEditingTitle(false);
  }

  async function handleDelete() {
    if (!article) return;
    await deleteArticle(supabase, article.id);
    toast.success('Article deleted');
    router.push('/articles');
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-sm text-gray-400">Loading article...</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
        <p className="text-sm text-gray-400">Article not found.</p>
        <Link href="/articles" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
          Back to Articles
        </Link>
      </div>
    );
  }

  const content = tab === 'markdown' ? article.markdown : (article.html ?? '');
  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: 'markdown', label: 'Markdown', show: true },
    { id: 'preview', label: 'Preview', show: !!article.html },
    { id: 'html', label: 'HTML', show: !!article.html },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)]">
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
                    ? 'bg-black text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
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
        ) : (
          <textarea
            readOnly
            value={content}
            className="w-full min-h-[500px] rounded-2xl border border-gray-200 bg-gray-50/30 px-4 py-3 font-mono text-sm leading-relaxed focus:outline-none"
          />
        )}
      </div>
    </div>
  );
}
