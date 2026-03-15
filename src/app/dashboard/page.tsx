'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText, TrendingUp, Calendar, PenSquare,
  Building2, Video, Globe, ClipboardPaste, Youtube,
  ArrowRight, Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useWorkspace } from '@/contexts/workspace-context';
import { getWorkspaceStats } from '@/lib/supabase/queries';
import { cn } from '@/utils/cn';

interface DashboardStats {
  totalArticles: number;
  thisWeek: number;
  thisMonth: number;
  bySource: { youtube: number; loom: number; 'google-drive': number; paste: number };
  recentArticles: { id: string; title: string; source_type: string; created_at: string }[];
  hasCompanyContext: boolean;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();
  const { activeWorkspace } = useWorkspace();

  useEffect(() => {
    if (!activeWorkspace) return;

    (async () => {
      setLoading(true);

      const [wsStats, { data: recentArticles }] = await Promise.all([
        getWorkspaceStats(supabase, activeWorkspace.id),
        supabase
          .from('articles')
          .select('id, title, source_type, created_at')
          .eq('workspace_id', activeWorkspace.id)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const hasCompanyContext = !!(activeWorkspace.companyName || activeWorkspace.companyDescription);

      setStats({
        totalArticles: wsStats.totalArticles,
        thisWeek: wsStats.thisWeek,
        thisMonth: wsStats.thisMonth,
        bySource: wsStats.bySource,
        recentArticles: recentArticles ?? [],
        hasCompanyContext,
      });
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id]);

  if (loading || !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-violet-500" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  const sourceItems = [
    { key: 'youtube', label: 'YouTube', icon: Youtube, count: stats.bySource.youtube, color: 'text-red-500', bg: 'bg-red-50' },
    { key: 'loom', label: 'Loom', icon: Video, count: stats.bySource.loom, color: 'text-purple-500', bg: 'bg-purple-50' },
    { key: 'google-drive', label: 'Google Drive', icon: Globe, count: stats.bySource['google-drive'], color: 'text-green-500', bg: 'bg-green-50' },
    { key: 'paste', label: 'Paste', icon: ClipboardPaste, count: stats.bySource.paste, color: 'text-gray-500', bg: 'bg-gray-100' },
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              {activeWorkspace?.name ?? 'Dashboard'}
            </h1>
            <p className="text-sm text-gray-400 mt-1">Workspace overview</p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:from-violet-700 hover:to-blue-600 transition-all"
          >
            <PenSquare className="h-4 w-4" />
            New Article
          </Link>
        </div>

        {/* Company Context Banner */}
        {!stats.hasCompanyContext && (
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-6 group hover:border-amber-300 transition-all"
          >
            <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-900">Set up company context</p>
              <p className="text-xs text-amber-600">Add your company info to generate more relevant articles</p>
            </div>
            <ArrowRight className="h-4 w-4 text-amber-400 group-hover:text-amber-600 transition-colors shrink-0" />
          </Link>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center">
                <FileText className="h-5 w-5 text-violet-500" />
              </div>
              <span className="text-sm font-medium text-gray-500">Total Articles</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalArticles}</p>
          </div>

          <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <span className="text-sm font-medium text-gray-500">This Week</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.thisWeek}</p>
          </div>

          <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-green-500" />
              </div>
              <span className="text-sm font-medium text-gray-500">This Month</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.thisMonth}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Articles */}
          <div className="lg:col-span-2 rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Recent Articles</h2>
              {stats.totalArticles > 0 && (
                <Link href="/articles" className="text-xs text-violet-500 hover:text-violet-700 transition-colors flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>

            {stats.recentArticles.length === 0 ? (
              <div className="text-center py-10">
                <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center mb-3">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm font-medium text-gray-700 mb-1">No articles yet</p>
                <p className="text-xs text-gray-400 mb-4">Generate your first article to get started</p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 font-medium"
                >
                  <PenSquare className="h-3.5 w-3.5" />
                  Create Article
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {stats.recentArticles.map((article) => {
                  const SourceIcon = article.source_type === 'youtube' ? Youtube
                    : article.source_type === 'loom' ? Video
                    : article.source_type === 'google-drive' ? Globe
                    : ClipboardPaste;
                  const sourceColor = article.source_type === 'youtube' ? 'text-red-400'
                    : article.source_type === 'loom' ? 'text-purple-400'
                    : article.source_type === 'google-drive' ? 'text-green-400'
                    : 'text-gray-400';

                  return (
                    <Link
                      key={article.id}
                      href={`/articles/${article.id}`}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-gray-50 transition-all group"
                    >
                      <SourceIcon className={cn('h-4 w-4 shrink-0', sourceColor)} />
                      <span className="flex-1 text-sm text-gray-700 truncate group-hover:text-gray-900">
                        {article.title}
                      </span>
                      <span className="text-xs text-gray-300 shrink-0">
                        {new Date(article.created_at).toLocaleDateString()}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sources Breakdown */}
          <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Sources</h2>

            {stats.totalArticles === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-gray-400">No data yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sourceItems.map((src) => {
                  const pct = stats.totalArticles > 0 ? Math.round((src.count / stats.totalArticles) * 100) : 0;
                  return (
                    <div key={src.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center', src.bg)}>
                            <src.icon className={cn('h-3.5 w-3.5', src.color)} />
                          </div>
                          <span className="text-sm text-gray-600">{src.label}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{src.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-500',
                            src.key === 'youtube' ? 'bg-red-400' :
                            src.key === 'loom' ? 'bg-purple-400' :
                            src.key === 'google-drive' ? 'bg-green-400' : 'bg-gray-300'
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Links */}
            <div className="mt-6 pt-4 border-t border-gray-100 space-y-1.5">
              <Link
                href="/settings"
                className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Building2 className="h-3.5 w-3.5" />
                {stats.hasCompanyContext ? 'Edit company context' : 'Set up company context'}
              </Link>
              <Link
                href="/articles"
                className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FileText className="h-3.5 w-3.5" />
                Browse all articles
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
