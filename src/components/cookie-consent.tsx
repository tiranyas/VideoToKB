'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const CONSENT_KEY = 'kbify-cookie-consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      // Small delay so the banner slides in smoothly after page load
      const timer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleAccept() {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-[100] p-4 animate-slide-up"
      style={{
        animation: 'slideUp 0.4s ease-out forwards',
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div className="mx-auto max-w-lg rounded-2xl bg-white shadow-xl shadow-gray-200/50 border border-gray-100 p-5">
        <div className="flex items-start gap-4">
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-gray-900">Cookie Notice</p>
            <p className="text-xs leading-relaxed text-gray-500">
              We use essential cookies only to keep you signed in. No tracking or analytics cookies.
              See our{' '}
              <Link href="/privacy" className="text-gray-700 underline hover:text-gray-900">
                Privacy Policy
              </Link>{' '}
              for details.
            </p>
          </div>
          <button
            onClick={handleAccept}
            className="shrink-0 rounded-xl bg-gradient-to-r from-violet-600 to-blue-500 px-5 py-2.5 text-sm font-medium text-white transition-all hover:from-violet-700 hover:to-blue-600"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
