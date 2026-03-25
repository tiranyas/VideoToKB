'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Shield, Users, Gift, ArrowUpCircle, Cpu, Zap, DollarSign, Clock, MessageSquare, ChevronDown, ChevronUp, Terminal, Globe } from 'lucide-react';
import { cn } from '@/utils/cn';

interface AdminUser {
  userId: string;
  email: string;
  planId: string;
  planName: string;
  articleLimit: number;
  status: string;
  bonusCredits: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  createdAt: string;
  totalArticles: number;
  articlesThisPeriod: number;
}

interface AgentUsage {
  model: string;
  agent: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  avgDurationMs: number;
  costEstimate: number;
}

interface UsageData {
  period: string;
  totals: {
    calls: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
  byAgent: AgentUsage[];
  daily: {
    day: string;
    calls: number;
    inputTokens: number;
    outputTokens: number;
    costEstimate: number;
  }[];
}

interface FeedbackTicket {
  id: string;
  userEmail: string;
  category: string;
  description: string;
  expected_behavior: string | null;
  severity: string;
  status: string;
  admin_notes: string | null;
  platform_name: string | null;
  article_title: string | null;
  console_errors: string[] | null;
  network_errors: string[] | null;
  created_at: string;
  resolved_at: string | null;
}

const CATEGORY_CONFIG: Record<string, { label: string; emoji: string }> = {
  bug: { label: 'Bug', emoji: '🐛' },
  quality: { label: 'Quality', emoji: '📝' },
  styling: { label: 'Styling', emoji: '🎨' },
  feature: { label: 'Feature', emoji: '💡' },
  other: { label: 'Other', emoji: '💬' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: 'Open', color: 'bg-red-100 text-red-700' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700' },
  wont_fix: { label: "Won't Fix", color: 'bg-gray-100 text-gray-600' },
};

const AGENT_LABELS: Record<string, string> = {
  draft: 'Draft Generator',
  structure: 'Structure Formatter',
  html: 'HTML Generator',
  'scrape-context': 'Website Scraper',
  'legacy-single': 'Legacy (Single)',
  unknown: 'Unknown',
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [creditsInput, setCreditsInput] = useState('');
  const [usageDays, setUsageDays] = useState(30);
  const [tickets, setTickets] = useState<FeedbackTicket[]>([]);
  const [ticketFilter, setTicketFilter] = useState<string>('all');
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState('');

  useEffect(() => {
    loadUsers();
    loadUsage(30);
    loadTickets();
  }, []);

  async function loadUsers() {
    try {
      const res = await fetch('/api/admin/users');
      if (res.status === 403) {
        setError('Access denied. Admin only.');
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function loadUsage(days: number) {
    try {
      const res = await fetch(`/api/admin/usage?days=${days}`);
      if (res.ok) {
        const data = await res.json();
        setUsage(data);
      }
    } catch {
      // Non-critical — usage section just stays empty
    }
  }

  async function loadTickets() {
    try {
      const res = await fetch('/api/admin/feedback');
      if (res.ok) {
        const data = await res.json();
        setTickets(data.feedback ?? []);
      }
    } catch {
      // Non-critical
    }
  }

  async function handleTicketStatus(id: string, status: string) {
    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(`Ticket ${status.replace('_', ' ')}`);
      loadTickets();
    } catch {
      toast.error('Failed to update ticket');
    }
  }

  async function handleSaveNotes(id: string) {
    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, adminNotes: notesInput }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Notes saved');
      setEditingNotes(null);
      loadTickets();
    } catch {
      toast.error('Failed to save notes');
    }
  }

  async function handleChangePlan(userId: string, planId: string) {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_plan', planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update plan');
    }
  }

  async function handleAddCredits(userId: string) {
    const credits = parseInt(creditsInput);
    if (isNaN(credits) || credits <= 0) {
      toast.error('Enter a valid number of credits');
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_credits', credits }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      setCreditsInput('');
      setActionUserId(null);
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add credits');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-2 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900">{error}</h1>
        </div>
      </div>
    );
  }

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.articlesThisPeriod > 0).length;
  const paidUsers = users.filter(u => u.planId !== 'free').length;
  const totalArticles = users.reduce((sum, u) => sum + u.totalArticles, 0);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Shield className="h-6 w-6 text-violet-600" />
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Users', value: totalUsers, icon: Users },
          { label: 'Active This Period', value: activeUsers, icon: Users },
          { label: 'Paid Users', value: paidUsers, icon: ArrowUpCircle },
          { label: 'Total Articles', value: totalArticles, icon: Gift },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <stat.icon className="h-4 w-4" />
              {stat.label}
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* API Usage Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-violet-600" />
            <h2 className="text-lg font-semibold text-gray-900">API Usage</h2>
          </div>
          <div className="flex items-center gap-2">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => { setUsageDays(d); loadUsage(d); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  usageDays === d
                    ? 'bg-violet-100 text-violet-700'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {usage ? (
          <>
            {/* Usage totals */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <Zap className="h-4 w-4" />
                  Total Calls
                </div>
                <div className="text-2xl font-bold text-gray-900">{usage.totals.calls}</div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <Cpu className="h-4 w-4" />
                  Input Tokens
                </div>
                <div className="text-2xl font-bold text-gray-900">{formatTokens(usage.totals.inputTokens)}</div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <Cpu className="h-4 w-4" />
                  Output Tokens
                </div>
                <div className="text-2xl font-bold text-gray-900">{formatTokens(usage.totals.outputTokens)}</div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <DollarSign className="h-4 w-4" />
                  Est. Cost
                </div>
                <div className="text-2xl font-bold text-gray-900">${usage.totals.cost.toFixed(2)}</div>
              </div>
            </div>

            {/* Breakdown by agent */}
            {usage.byAgent.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                  <h3 className="text-sm font-medium text-gray-700">Breakdown by Agent</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-4 py-2.5 font-medium text-gray-500">Agent</th>
                        <th className="text-left px-4 py-2.5 font-medium text-gray-500">Model</th>
                        <th className="text-right px-4 py-2.5 font-medium text-gray-500">Calls</th>
                        <th className="text-right px-4 py-2.5 font-medium text-gray-500">In Tokens</th>
                        <th className="text-right px-4 py-2.5 font-medium text-gray-500">Out Tokens</th>
                        <th className="text-right px-4 py-2.5 font-medium text-gray-500">Avg Time</th>
                        <th className="text-right px-4 py-2.5 font-medium text-gray-500">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usage.byAgent.map((row) => (
                        <tr key={`${row.model}-${row.agent}`} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                row.agent === 'draft' ? 'bg-blue-500' :
                                row.agent === 'structure' ? 'bg-green-500' :
                                row.agent === 'html' ? 'bg-orange-500' :
                                row.agent === 'scrape-context' ? 'bg-purple-500' :
                                'bg-gray-400'
                              }`} />
                              <span className="font-medium text-gray-900">
                                {AGENT_LABELS[row.agent] ?? row.agent}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-gray-500">
                            <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                              {row.model}
                            </code>
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-gray-900">{row.calls}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{formatTokens(row.inputTokens)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{formatTokens(row.outputTokens)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-500">
                            <div className="flex items-center justify-end gap-1">
                              <Clock className="h-3 w-3" />
                              {(row.avgDurationMs / 1000).toFixed(1)}s
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                            ${row.costEstimate.toFixed(4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Daily usage (mini bar chart) */}
            {usage.daily.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Daily API Calls</h3>
                <div className="flex items-end gap-1 h-24">
                  {usage.daily.slice(0, 30).reverse().map((day) => {
                    const maxCalls = Math.max(...usage.daily.map(d => d.calls), 1);
                    const height = Math.max(4, (day.calls / maxCalls) * 100);
                    return (
                      <div
                        key={day.day}
                        className="flex-1 bg-violet-200 hover:bg-violet-400 rounded-t transition-all cursor-default group relative"
                        style={{ height: `${height}%` }}
                        title={`${day.day}: ${day.calls} calls, $${day.costEstimate.toFixed(4)}`}
                      >
                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                          {day.day}: {day.calls} calls
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                  <span>{usage.daily.length > 0 ? usage.daily[usage.daily.length - 1]?.day : ''}</span>
                  <span>Today</span>
                </div>
              </div>
            )}

            {usage.byAgent.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <Cpu className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No API usage data yet. Generate some articles to see stats here.</p>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <div className="animate-spin h-6 w-6 border-2 border-violet-600 border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-sm text-gray-400">Loading usage data...</p>
          </div>
        )}
      </div>

      {/* Support Tickets */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-violet-600" />
            <h2 className="text-lg font-semibold text-gray-900">Support Tickets</h2>
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
              {tickets.filter(t => t.status === 'open').length} open
            </span>
          </div>
          <div className="flex items-center gap-2">
            {['all', 'open', 'in_progress', 'resolved'].map((f) => (
              <button
                key={f}
                onClick={() => setTicketFilter(f)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  ticketFilter === f
                    ? 'bg-violet-100 text-violet-700'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                )}
              >
                {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {tickets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No support tickets yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets
              .filter(t => ticketFilter === 'all' || t.status === ticketFilter)
              .map((ticket) => {
                const isExpanded = expandedTicket === ticket.id;
                const cat = CATEGORY_CONFIG[ticket.category] ?? { label: ticket.category, emoji: '?' };
                const st = STATUS_CONFIG[ticket.status] ?? { label: ticket.status, color: 'bg-gray-100 text-gray-600' };
                const hasErrors = (ticket.console_errors?.length ?? 0) > 0 || (ticket.network_errors?.length ?? 0) > 0;

                return (
                  <div key={ticket.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    {/* Row header */}
                    <button
                      onClick={() => setExpandedTicket(isExpanded ? null : ticket.id)}
                      className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors text-left"
                    >
                      <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', st.color)}>
                        {st.label}
                      </span>
                      <span className="text-sm">{cat.emoji} {cat.label}</span>
                      <span className="text-sm text-gray-500 truncate flex-1">{ticket.description.slice(0, 80)}{ticket.description.length > 80 ? '...' : ''}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">{ticket.userEmail}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">{new Date(ticket.created_at).toLocaleDateString()}</span>
                      {hasErrors && <span title="Has error logs"><Terminal className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" /></span>}
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                        {/* Meta info */}
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                          <span>Severity: <strong className="text-gray-700">{ticket.severity}</strong></span>
                          <span>Ticket: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{ticket.id.slice(0, 8)}</code></span>
                          {ticket.platform_name && <span>Platform: {ticket.platform_name}</span>}
                          {ticket.article_title && <span>Article: {ticket.article_title}</span>}
                          {ticket.resolved_at && <span>Resolved: {new Date(ticket.resolved_at).toLocaleString()}</span>}
                        </div>

                        {/* Description */}
                        <div className="rounded-xl bg-gray-50 p-4">
                          <h4 className="text-xs font-medium text-gray-500 mb-2">Description</h4>
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">{ticket.description}</p>
                        </div>

                        {/* Expected behavior */}
                        {ticket.expected_behavior && (
                          <div className="rounded-xl bg-gray-50 p-4">
                            <h4 className="text-xs font-medium text-gray-500 mb-2">Expected Behavior</h4>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap">{ticket.expected_behavior}</p>
                          </div>
                        )}

                        {/* Console errors */}
                        {ticket.console_errors && ticket.console_errors.length > 0 && (
                          <div className="rounded-xl bg-red-50 border border-red-100 p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Terminal className="h-3.5 w-3.5 text-red-600" />
                              <h4 className="text-xs font-medium text-red-700">Console Errors ({ticket.console_errors.length})</h4>
                            </div>
                            <pre className="text-xs text-gray-800 bg-gray-900 text-gray-100 rounded-lg p-3 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">
                              {ticket.console_errors.join('\n')}
                            </pre>
                          </div>
                        )}

                        {/* Network errors */}
                        {ticket.network_errors && ticket.network_errors.length > 0 && (
                          <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Globe className="h-3.5 w-3.5 text-amber-600" />
                              <h4 className="text-xs font-medium text-amber-700">Failed Network Requests ({ticket.network_errors.length})</h4>
                            </div>
                            <pre className="text-xs bg-gray-900 text-gray-100 rounded-lg p-3 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">
                              {ticket.network_errors.join('\n')}
                            </pre>
                          </div>
                        )}

                        {/* Admin notes */}
                        <div className="rounded-xl bg-violet-50 border border-violet-100 p-4">
                          <h4 className="text-xs font-medium text-violet-700 mb-2">Admin Notes</h4>
                          {editingNotes === ticket.id ? (
                            <div className="flex gap-2">
                              <textarea
                                value={notesInput}
                                onChange={(e) => setNotesInput(e.target.value)}
                                rows={2}
                                className="flex-1 rounded-lg border border-violet-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 resize-none"
                                autoFocus
                              />
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={() => handleSaveNotes(ticket.id)}
                                  className="px-3 py-1 bg-violet-600 text-white text-xs rounded-lg hover:bg-violet-700"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingNotes(null)}
                                  className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingNotes(ticket.id); setNotesInput(ticket.admin_notes ?? ''); }}
                              className="text-sm text-gray-600 hover:text-violet-700 transition-colors"
                            >
                              {ticket.admin_notes || 'Click to add notes...'}
                            </button>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2">
                          <span className="text-xs text-gray-500 mr-2">Set status:</span>
                          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                            <button
                              key={key}
                              onClick={() => handleTicketStatus(ticket.id, key)}
                              disabled={ticket.status === key}
                              className={cn(
                                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                ticket.status === key
                                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                  : `${cfg.color} hover:opacity-80`
                              )}
                            >
                              {cfg.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Users table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-sm font-medium text-gray-700">Users</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">User</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Usage</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Bonus</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Joined</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.userId} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 truncate max-w-[200px]">
                      {u.email !== u.userId ? u.email : u.userId.slice(0, 8) + '...'}
                    </div>
                    <div className="text-xs text-gray-400">{u.userId.slice(0, 8)}...</div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.planId}
                      onChange={(e) => handleChangePlan(u.userId, e.target.value)}
                      className="rounded-lg border border-gray-200 px-2 py-1 text-sm bg-white"
                    >
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="business">Business</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium">
                        {u.articlesThisPeriod}/{u.articleLimit + u.bonusCredits}
                      </div>
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-violet-500 rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, (u.articlesThisPeriod / Math.max(1, u.articleLimit + u.bonusCredits)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">{u.totalArticles} total</div>
                  </td>
                  <td className="px-4 py-3">
                    {actionUserId === u.userId ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={creditsInput}
                          onChange={(e) => setCreditsInput(e.target.value)}
                          placeholder="#"
                          className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddCredits(u.userId);
                            if (e.key === 'Escape') { setActionUserId(null); setCreditsInput(''); }
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleAddCredits(u.userId)}
                          className="text-xs text-violet-600 font-medium hover:text-violet-800"
                        >
                          Add
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setActionUserId(u.userId)}
                        className="text-xs text-gray-400 hover:text-violet-600 transition-colors flex items-center gap-1"
                        title="Add bonus credits"
                      >
                        <Gift className="h-3.5 w-3.5" />
                        {u.bonusCredits > 0 ? `+${u.bonusCredits}` : 'Add'}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-400">
                      Period: {new Date(u.currentPeriodStart).toLocaleDateString()} - {new Date(u.currentPeriodEnd).toLocaleDateString()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
