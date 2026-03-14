'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Trash2, FileText, Globe, Video, ClipboardPaste } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
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

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const data = await getArticles(supabase, user.id);
      setArticles(data as ArticleWithMeta[]);
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: string) {
    await deleteArticle(supabase, id);
    setArticles((prev) => prev.filter((a) => a.id !== id));
    toast.success('Article deleted');
  }

  const filtered = search
    ? articles.filter((a) => a.title.toLowerCase().includes(search.toLowerCase()))
    : articles;

  const sourceIcon = (type: string) => {
    if (type === 'loom') return <Video className="h-4 w-4 text-purple-400" />;
    if (type === 'google-drive') return <Globe className="h-4 w-4 text-green-400" />;
    return <ClipboardPaste className="h-4 w-4 text-gray-400" />;
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-sm text-gray-400">Loading articles...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Articles</h1>
          <Link
            href="/"
            className="rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
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
          <div className="rounded-2xl border border-gray-100 p-16 text-center">
            <FileText className="mx-auto h-10 w-10 text-gray-200" />
            <p className="mt-4 text-sm text-gray-400">
              {search ? 'No articles match your search.' : 'No articles yet. Generate your first article!'}
            </p>
            {!search && (
              <Link
                href="/"
                className="mt-4 inline-block rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
              >
                Generate Article
              </Link>
            )}
          </div>
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
                      {article.html && <span className="text-indigo-400">HTML</span>}
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
