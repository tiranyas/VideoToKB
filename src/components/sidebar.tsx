'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { PenSquare, FileText, Settings, LogOut, Menu, X, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/utils/cn';

interface RecentArticle {
  id: string;
  title: string;
  created_at: string;
}

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const supabase = createClient();
  const [recentArticles, setRecentArticles] = useState<RecentArticle[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('articles')
        .select('id, title, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(15);
      if (data) setRecentArticles(data);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  const navItems = [
    { href: '/', label: 'Generate', icon: PenSquare, active: pathname === '/' },
    { href: '/articles', label: 'Articles', icon: FileText, active: pathname === '/articles' },
    { href: '/settings', label: 'Settings', icon: Settings, active: pathname === '/settings' },
  ];

  // Group articles by time period
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(todayStart);
  monthStart.setDate(monthStart.getDate() - 30);

  const groups: { label: string; articles: RecentArticle[] }[] = [];
  const today: RecentArticle[] = [];
  const thisWeek: RecentArticle[] = [];
  const thisMonth: RecentArticle[] = [];
  const older: RecentArticle[] = [];

  for (const a of recentArticles) {
    const d = new Date(a.created_at);
    if (d >= todayStart) today.push(a);
    else if (d >= weekStart) thisWeek.push(a);
    else if (d >= monthStart) thisMonth.push(a);
    else older.push(a);
  }

  if (today.length) groups.push({ label: 'Today', articles: today });
  if (thisWeek.length) groups.push({ label: 'This Week', articles: thisWeek });
  if (thisMonth.length) groups.push({ label: 'This Month', articles: thisMonth });
  if (older.length) groups.push({ label: 'Older', articles: older });

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-gray-900">
          <Image src="/logo.png" alt="KBify" width={32} height={32} />
          {!collapsed && 'KBify'}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className={cn('h-4 w-4 transition-transform', !collapsed && 'rotate-180')} />
        </button>
      </div>

      {/* New Article Button */}
      <div className="px-3 mb-1">
        <Link
          href="/"
          className={cn(
            'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
            pathname === '/'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          )}
        >
          <PenSquare className="h-4 w-4 shrink-0" />
          New Article
        </Link>
      </div>

      {/* Nav Links */}
      <div className="px-3 space-y-0.5">
        {navItems.filter(n => n.href !== '/').map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-all',
              item.active
                ? 'bg-gray-100 text-gray-900 font-medium'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        ))}
      </div>

      {/* Divider */}
      <div className="mx-4 my-3 border-t border-gray-100" />

      {/* Recent Articles */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {groups.map((group) => (
          <div key={group.label} className="mb-3">
            <p className="px-3 mb-1 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
              {group.label}
            </p>
            {group.articles.map((article) => (
              <Link
                key={article.id}
                href={`/articles/${article.id}`}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'block rounded-lg px-3 py-1.5 text-sm truncate transition-all',
                  pathname === `/articles/${article.id}`
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                )}
                title={article.title}
              >
                {article.title}
              </Link>
            ))}
          </div>
        ))}
        {recentArticles.length === 0 && (
          <div className="px-3 space-y-2">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Getting Started</p>
            <div className="rounded-lg bg-gray-50 px-3 py-2.5 space-y-1.5">
              <p className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">1.</span> Add your company info in{' '}
                <Link href="/settings" className="text-violet-500 hover:text-violet-600">Settings</Link>
              </p>
              <p className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">2.</span> Paste a video URL on the{' '}
                <Link href="/" className="text-violet-500 hover:text-violet-600">Generate</Link> page
              </p>
              <p className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">3.</span> Your articles will appear here
              </p>
            </div>
          </div>
        )}
      </div>

      {/* User footer */}
      <div className="border-t border-gray-100 px-3 py-3 space-y-2">
        <div className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors">
          <span className="text-xs text-gray-400 truncate max-w-[160px]">{email}</span>
          <button
            onClick={handleSignOut}
            className="text-gray-300 hover:text-gray-600 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-3 px-3">
          <Link href="/privacy" className="text-[11px] text-gray-300 hover:text-gray-500 transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="text-[11px] text-gray-300 hover:text-gray-500 transition-colors">
            Terms
          </Link>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden h-9 w-9 flex items-center justify-center rounded-xl bg-white shadow-md text-gray-600"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen w-[260px] bg-white/95 backdrop-blur-xl border-r border-gray-100 flex flex-col transition-transform duration-200 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex fixed top-0 left-0 h-screen bg-white/80 backdrop-blur-xl border-r border-gray-100 flex-col transition-all duration-200 z-30',
          collapsed ? 'w-0 overflow-hidden opacity-0' : 'w-[260px]'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Collapsed toggle */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="hidden lg:flex fixed top-4 left-4 z-30 h-9 w-9 items-center justify-center rounded-xl bg-white shadow-md text-gray-600 hover:text-gray-900 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* Spacer for layout push */}
      <div className={cn('hidden lg:block shrink-0 transition-all duration-200', collapsed ? 'w-0' : 'w-[260px]')} />
    </>
  );
}
