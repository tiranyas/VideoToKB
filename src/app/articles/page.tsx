'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Trash2, FileText, Globe, Video, ClipboardPaste, Sparkles, Link2, Type, Youtube } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useWorkspace } from '@/contexts/workspace-context';
import { getArticles, deleteArticle } from '@/lib/supabase/queries';
import type { Article } from '@/types';

interface ArticleWithMeta extends Article {
  articleTypeName?: string;
  platformName?: string;
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<ArticleWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const supabase = createClient();
  const { activeWorkspace } = useWorkspace();

  useEffect(() => {
    if (!activeWorkspace) return;
    (async () => {
      const data = await getArticles(supabase, activeWorkspace.id);
      setArticles(data as ArticleWithMeta[]);
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id]);

  async function handleDelete(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await deleteArticle(supabase, id, user.id);
    setArticles((prev) => prev.filter((a) => a.id !== id));
    toast.success('Article deleted');
  }

  const filtered = search
    ? articles.filter((a) => a.title.toLowerCase().includes(search.toLowerCase()))
    : articles;

  const sourceIcon = (type: string) => {
    if (type === 'youtube') return <Youtube className="h-4 w-4 text-red-400" />;
    if (type === 'loom') return <Video className="h-4 w-4 text-purple-400" />;
    if (type === 'google-drive') return <Globe className="h-4 w-4 text-green-400" />;
    return <ClipboardPaste className="h-4 w-4 text-gray-400" />;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-400">Loading articles...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Articles</h1>
          <Link
            href="/"
            className="rounded-xl bg-gradient-to-r from-violet-600 to-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:from-violet-700 hover:to-blue-600 transition-all"
          >
            + New Article
          </Link>
        </div>

        {articles.length > 0 && (
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles..."
            className="w-full rounded-full bg-gray-100 border-0 px-5 py-2.5 text-sm mb-6 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
          />
        )}

        {filtered.length === 0 ? (
          search ? (
            <div className="rounded-2xl border border-gray-100 p-16 text-center">
              <FileText className="mx-auto h-10 w-10 text-gray-200" />
              <p className="mt-4 text-sm text-gray-400">No articles match your search.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white p-10">
              <div className="text-center mb-8">
                <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-lg font-semibold tracking-tight text-gray-900">Create your first article</h2>
                <p className="mt-1 text-sm text-gray-400">Turn any video recording into a structured KB article in minutes</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="rounded-xl bg-gray-50 p-4 text-center">
                  <div className="mx-auto h-8 w-8 rounded-lg bg-white shadow-sm flex items-center justify-center mb-2">
                    <Link2 className="h-4 w-4 text-violet-500" />
                  </div>
                  <p className="text-xs font-medium text-gray-700">Paste a URL</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Loom or Google Drive</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4 text-center">
                  <div className="mx-auto h-8 w-8 rounded-lg bg-white shadow-sm flex items-center justify-center mb-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                  </div>
                  <p className="text-xs font-medium text-gray-700">AI generates</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Draft, structure & format</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4 text-center">
                  <div className="mx-auto h-8 w-8 rounded-lg bg-white shadow-sm flex items-center justify-center mb-2">
                    <Type className="h-4 w-4 text-green-500" />
                  </div>
                  <p className="text-xs font-medium text-gray-700">Get your article</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Markdown & platform HTML</p>
                </div>
              </div>

              <div className="text-center">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-500 px-5 py-3 text-sm font-medium text-white hover:from-violet-700 hover:to-blue-600 transition-all"
                >
                  <Sparkles className="h-4 w-4" /> Generate Your First Article
                </Link>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-2">
            {filtered.map((article) => (
              <div
                key={article.id}
                className="rounded-2xl bg-white shadow-sm hover:shadow-md p-5 transition-all"
              >
                <div className="flex items-start justify-between">
                  <Link href={`/articles/${article.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      {sourceIcon(article.sourceType)}
                      <h3 className="font-medium text-gray-900 truncate">{article.title}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 ml-[26px]">
                      {(article as ArticleWithMeta).articleTypeName && (
                        <span>{(article as ArticleWithMeta).articleTypeName}</span>
                      )}
                      {(article as ArticleWithMeta).platformName && (
                        <span>{(article as ArticleWithMeta).platformName}</span>
                      )}
                      {article.html && <span className="text-violet-400">HTML</span>}
                      <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                    </div>
                  </Link>
                  <button
                    onClick={() => handleDelete(article.id)}
                    className="ml-4 text-gray-300 hover:text-red-400 transition-colors"
                    title="Delete article"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
