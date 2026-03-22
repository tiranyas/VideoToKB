'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

type Mode = 'sign-in' | 'sign-up' | 'forgot-password' | 'reset-password';

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50/50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-violet-500" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

function getInitialMode(searchParams: URLSearchParams): { mode: Mode; initialError: string } {
  if (searchParams.get('mode') === 'reset-password') {
    return { mode: 'reset-password', initialError: '' };
  }
  if (searchParams.get('signup') === 'true') {
    return { mode: 'sign-up', initialError: '' };
  }
  if (searchParams.get('error') === 'invalid_token') {
    return { mode: 'sign-in', initialError: 'Your reset link has expired or is invalid. Please request a new one.' };
  }
  return { mode: 'sign-in', initialError: '' };
}

function LoginContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { mode: initialMode, initialError } = getInitialMode(searchParams);

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);

  function switchMode(newMode: Mode) {
    setMode(newMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setSent(false);
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  async function handlePasswordAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (mode === 'sign-up') {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) {
        setError(error.message);
      } else {
        setSent(true);
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

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm`,
    });
    setLoading(false);
    if (error) { setError(error.message); } else { setSent(true); }
  }

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); }
    else { router.push('/'); router.refresh(); }
  }

  const inputClassName = "w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3.5 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all";
  const submitClassName = "w-full rounded-xl bg-gradient-to-r from-violet-600 to-blue-500 px-6 py-3.5 text-sm font-medium text-white transition-all hover:from-violet-700 hover:to-blue-600 disabled:opacity-50";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50/50">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-white shadow-xl shadow-gray-200/50 p-8 space-y-6 text-center">
          <div className="flex flex-col items-center">
            <Image src="/logo.png" alt="KBPipe" width={80} height={80} className="mb-3" />
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">KBPipe</h1>
            <p className="mt-2 text-sm text-gray-400">Turn any content into KB articles</p>
          </div>

          {/* Sign-in sent state (shouldn't happen, but just in case) */}
          {sent && mode === 'sign-up' && (
            <div className="rounded-xl bg-green-50 p-5">
              <p className="text-sm font-medium text-green-800">Check your email</p>
              <p className="mt-2 text-sm text-green-600">
                We sent a confirmation link to <strong>{email}</strong>.
              </p>
              <button
                onClick={() => { setSent(false); setError(''); }}
                className="mt-4 text-sm text-green-700 hover:text-green-900 transition-colors"
              >
                Back
              </button>
            </div>
          )}

          {sent && mode === 'forgot-password' && (
            <div className="rounded-xl bg-green-50 p-5">
              <p className="text-sm font-medium text-green-800">Check your email</p>
              <p className="mt-2 text-sm text-green-600">
                We sent a password reset link to <strong>{email}</strong>.
              </p>
              <button
                onClick={() => { setSent(false); setError(''); }}
                className="mt-4 text-sm text-green-700 hover:text-green-900 transition-colors"
              >
                Back
              </button>
            </div>
          )}

          {!sent && mode === 'sign-in' && (
            <>
              {/* Google SSO */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-6 py-3.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.26c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 2.58Z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-400">or</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              {/* Email/password form */}
              <form onSubmit={handlePasswordAuth} className="space-y-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClassName}
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className={inputClassName}
                />
                <button type="submit" disabled={loading} className={submitClassName}>
                  {loading ? 'Loading...' : 'Sign In'}
                </button>
              </form>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => switchMode('forgot-password')}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Forgot password?
                </button>
                <br />
                <button
                  type="button"
                  onClick={() => switchMode('sign-up')}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Don&apos;t have an account? Sign Up
                </button>
              </div>
            </>
          )}

          {!sent && mode === 'sign-up' && (
            <>
              {/* Google SSO */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-6 py-3.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.26c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 2.58Z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-400">or</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              {/* Signup form */}
              <form onSubmit={handlePasswordAuth} className="space-y-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClassName}
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password (min 6 characters)"
                  className={inputClassName}
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className={inputClassName}
                />
                <button type="submit" disabled={loading} className={submitClassName}>
                  {loading ? 'Loading...' : 'Sign Up'}
                </button>
              </form>

              <button
                type="button"
                onClick={() => switchMode('sign-in')}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Already have an account? Sign In
              </button>
            </>
          )}

          {!sent && mode === 'forgot-password' && (
            <>
              <div>
                <h2 className="text-lg font-medium text-gray-900">Reset your password</h2>
                <p className="mt-1 text-sm text-gray-400">Enter your email and we&apos;ll send you a reset link</p>
              </div>
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClassName}
                />
                <button type="submit" disabled={loading} className={submitClassName}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
              <button
                type="button"
                onClick={() => switchMode('sign-in')}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Back to Sign In
              </button>
            </>
          )}

          {mode === 'reset-password' && (
            <>
              <div>
                <h2 className="text-lg font-medium text-gray-900">Set new password</h2>
                <p className="mt-1 text-sm text-gray-400">Enter your new password below</p>
              </div>
              <form onSubmit={handlePasswordUpdate} className="space-y-3">
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password (min 6 characters)"
                  className={inputClassName}
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className={inputClassName}
                />
                <button type="submit" disabled={loading} className={submitClassName}>
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
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
