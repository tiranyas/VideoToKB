'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Shield, Users, Gift, ArrowUpCircle } from 'lucide-react';

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

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [creditsInput, setCreditsInput] = useState('');

  useEffect(() => {
    loadUsers();
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

      {/* Users table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
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
