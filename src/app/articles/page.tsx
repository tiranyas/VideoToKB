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
    if (type === 'loom') return <Video className="h-4 w-4 text-purple-500" />;
    if (type === 'google-drive') return <Globe className="h-4 w-4 text-green-500" />;
    return <ClipboardPaste className="h-4 w-4 text-gray-500" />;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading articles...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Articles</h1>
          <Link
            href="/"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
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
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm mb-4 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        )}

        {filtered.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-gray-500">
              {search ? 'No articles match your search.' : 'No articles yet. Generate your first article!'}
            </p>
            {!search && (
              <Link
                href="/"
                className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Generate Article
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((article) => (
              <div
                key={article.id}
                className="rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <Link href={`/articles/${article.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {sourceIcon(article.sourceType)}
                      <h3 className="font-semibold text-gray-900 truncate">{article.title}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {(article as ArticleWithMeta).articleTypeName && (
                        <span>{(article as ArticleWithMeta).articleTypeName}</span>
                      )}
                      {(article as ArticleWithMeta).platformName && (
                        <span>{(article as ArticleWithMeta).platformName}</span>
                      )}
                      {article.html && <span className="text-green-500">HTML</span>}
                      <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                    </div>
                  </Link>
                  <button
                    onClick={() => handleDelete(article.id)}
                    className="ml-4 text-gray-400 hover:text-red-500 transition-colors"
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
