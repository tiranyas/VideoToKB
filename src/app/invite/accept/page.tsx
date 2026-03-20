'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { acceptInvite } from '@/lib/supabase/queries';
import { useWorkspace } from '@/contexts/workspace-context';

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { switchWorkspace, refreshWorkspaces } = useWorkspace();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No invite token provided');
      return;
    }

    const accept = async () => {
      const supabase = createClient();
      try {
        const result = await acceptInvite(supabase, token);
        if ('error' in result) {
          setStatus('error');
          setErrorMessage(result.error);
          return;
        }
        setStatus('success');
        await refreshWorkspaces();
        switchWorkspace(result.workspaceId);
        setTimeout(() => router.push('/'), 1500);
      } catch (err) {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Failed to accept invite');
      }
    };

    accept();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900">Accepting invite...</h1>
            <p className="text-gray-500 mt-2">Please wait while we set up your access.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900">You have joined the workspace!</h1>
            <p className="text-gray-500 mt-2">Redirecting you now...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900">Unable to accept invite</h1>
            <p className="text-red-600 mt-2">{errorMessage}</p>
            <Link href="/" className="inline-block mt-6 text-blue-600 hover:text-blue-700 font-medium">
              Go to dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
