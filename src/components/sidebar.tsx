'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { PenSquare, FileText, Settings, LogOut, Menu, X, ChevronRight, ChevronDown, Plus, Building2, LayoutDashboard, Sparkles, Zap, Crown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useWorkspace } from '@/contexts/workspace-context';
import { cn } from '@/utils/cn';
import type { UserUsage } from '@/types';

interface RecentArticle {
  id: string;
  title: string;
  created_at: string;
}

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { activeWorkspace, workspaces, switchWorkspace, createWorkspace } = useWorkspace();
  const [recentArticles, setRecentArticles] = useState<RecentArticle[]>([]);
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const [creatingWs, setCreatingWs] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const wsDropdownRef = useRef<HTMLDivElement>(null);
  const newWsInputRef = useRef<HTMLInputElement>(null);

  // Load articles scoped to active workspace
  useEffect(() => {
    if (!activeWorkspace) return;
    (async () => {
      const { data } = await supabase
        .from('articles')
        .select('id, title, created_at')
        .eq('workspace_id', activeWorkspace.id)
        .order('created_at', { ascending: false })
        .limit(15);
      if (data) setRecentArticles(data);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, activeWorkspace?.id]);

  // Load user usage
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.rpc('get_user_usage', { p_user_id: user.id });
      if (error) return;
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        setUsage({
          articlesThisPeriod: row.articles_this_period,
          articleLimit: row.article_limit,
          bonusCredits: row.bonus_credits,
          articlesRemaining: row.articles_remaining,
          planId: row.plan_id,
          planName: row.plan_name,
          periodStart: row.period_start,
          periodEnd: row.period_end,
        });
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wsDropdownRef.current && !wsDropdownRef.current.contains(e.target as Node)) {
        setWsDropdownOpen(false);
        setCreatingWs(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Auto-focus new workspace input
  useEffect(() => {
    if (creatingWs && newWsInputRef.current) {
      newWsInputRef.current.focus();
    }
  }, [creatingWs]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  async function handleCreateWorkspace() {
    const name = newWsName.trim();
    if (!name) return;
    try {
      await createWorkspace(name);
      setNewWsName('');
      setCreatingWs(false);
      setWsDropdownOpen(false);
    } catch {
      // slug conflict or other error — ignore silently
    }
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, active: pathname === '/dashboard' },
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
      {/* Logo + Plan Badge */}
      <div className="flex items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-gray-900">
            <Image src="/logo.png" alt="KBPipe" width={32} height={32} />
            {!collapsed && 'KBPipe'}
          </Link>
          {!collapsed && usage && (
            <Link
              href="/billing"
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-all hover:scale-105',
                usage.planId === 'free'
                  ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  : usage.planId === 'pro'
                  ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              )}
              title="Click to upgrade"
            >
              {usage.planId === 'free' ? (
                <Sparkles className="h-3 w-3" />
              ) : usage.planId === 'pro' ? (
                <Zap className="h-3 w-3" />
              ) : (
                <Crown className="h-3 w-3" />
              )}
              {usage.planName}
            </Link>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className={cn('h-4 w-4 transition-transform', !collapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Workspace Switcher */}
      {!collapsed && (
        <div className="px-3 mb-2 relative" ref={wsDropdownRef}>
          <button
            onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
            className="flex items-center gap-2 w-full rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="flex-1 text-left truncate font-medium">
              {activeWorkspace?.name ?? 'Workspace'}
            </span>
            <ChevronDown className={cn('h-3.5 w-3.5 text-gray-400 transition-transform', wsDropdownOpen && 'rotate-180')} />
          </button>

          {wsDropdownOpen && (
            <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-xl bg-white border border-gray-200 shadow-lg py-1 max-h-64 overflow-y-auto">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    if (ws.id !== activeWorkspace?.id) {
                      switchWorkspace(ws.id);
                      router.push('/dashboard');
                    }
                    setWsDropdownOpen(false);
                  }}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors text-left',
                    ws.id === activeWorkspace?.id
                      ? 'bg-violet-50 text-violet-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{ws.name}</span>
                </button>
              ))}

              <div className="border-t border-gray-100 mt-1 pt-1">
                {creatingWs ? (
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleCreateWorkspace(); }}
                    className="px-3 py-1.5"
                  >
                    <input
                      ref={newWsInputRef}
                      value={newWsName}
                      onChange={(e) => setNewWsName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Escape') { setCreatingWs(false); setNewWsName(''); } }}
                      placeholder="Workspace name..."
                      className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
                    />
                  </form>
                ) : (
                  <button
                    onClick={() => setCreatingWs(true)}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New Workspace
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

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
        {/* Usage bar */}
        {!collapsed && usage && (
          <div className="px-3 py-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-gray-500">Articles this month</span>
              <span className={cn(
                'text-[11px] font-semibold',
                usage.articlesRemaining === 0 ? 'text-red-500' : usage.articlesRemaining <= 2 ? 'text-amber-500' : 'text-gray-600'
              )}>
                {usage.articlesThisPeriod}/{usage.articleLimit + usage.bonusCredits}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  usage.articlesRemaining === 0 ? 'bg-red-400' : usage.articlesRemaining <= 2 ? 'bg-amber-400' : 'bg-violet-400'
                )}
                style={{ width: `${Math.min(100, (usage.articlesThisPeriod / (usage.articleLimit + usage.bonusCredits)) * 100)}%` }}
              />
            </div>
            {usage.articlesRemaining === 0 && (
              <Link
                href="/billing"
                className="block mt-1.5 text-[11px] text-red-500 hover:text-red-600 font-medium transition-colors"
              >
                Limit reached — Upgrade plan
              </Link>
            )}
          </div>
        )}

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
