'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export function UserMenu({ email }: { email: string }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 hidden sm:inline">
        {email}
      </span>
      <button
        onClick={handleSignOut}
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        title="Sign out"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Sign Out</span>
      </button>
    </div>
  );
}
