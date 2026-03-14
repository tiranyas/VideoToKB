'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Mode = 'password' | 'magic-link';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  async function handlePasswordAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) {
        setError(error.message);
      } else {
        router.push('/');
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        setError(error.message);
      } else {
        router.push('/');
        router.refresh();
      }
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50/50">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-white shadow-xl shadow-gray-200/50 p-8 space-y-6 text-center">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">KBify</h1>
            <p className="mt-2 text-sm text-gray-400">Turn video recordings into KB articles</p>
          </div>

          {sent ? (
            <div className="rounded-xl bg-green-50 p-5">
              <p className="text-sm font-medium text-green-800">Check your email</p>
              <p className="mt-2 text-sm text-green-600">
                {isSignUp
                  ? <>We sent a confirmation link to <strong>{email}</strong>.</>
                  : <>We sent a magic link to <strong>{email}</strong>.</>
                }
              </p>
              <button
                onClick={() => { setSent(false); setError(''); }}
                className="mt-4 text-sm text-green-700 hover:text-green-900 transition-colors"
              >
                Back
              </button>
            </div>
          ) : (
            <>
              {/* Mode toggle */}
              <div className="bg-gray-100 rounded-full p-1 flex">
                <button
                  onClick={() => { setMode('password'); setError(''); }}
                  className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition-all ${
                    mode === 'password' ? 'bg-black text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Email & Password
                </button>
                <button
                  onClick={() => { setMode('magic-link'); setError(''); }}
                  className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition-all ${
                    mode === 'magic-link' ? 'bg-black text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Magic Link
                </button>
              </div>

              {mode === 'password' ? (
                <form onSubmit={handlePasswordAuth} className="space-y-3">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3.5 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
                  />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (min 6 characters)"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3.5 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-black px-6 py-3.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                    className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleMagicLink} className="space-y-3">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3.5 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-black px-6 py-3.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Send Magic Link'}
                  </button>
                </form>
              )}

              {error && <p className="text-sm text-red-500">{error}</p>}
            </>
          )}
        </div>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Link href="/privacy" className="text-xs text-gray-300 hover:text-gray-500 transition-colors">
            Privacy Policy
          </Link>
          <span className="text-gray-200">|</span>
          <Link href="/terms" className="text-xs text-gray-300 hover:text-gray-500 transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}
