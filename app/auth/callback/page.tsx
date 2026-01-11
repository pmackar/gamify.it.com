'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function AuthCallbackContent() {
  const [status, setStatus] = useState('Processing...');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleAuth = async () => {
      const supabase = createClient();

      // Try to get session (handles both OAuth and magic link flows)
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        setStatus(`Error: ${error.message}`);
        setTimeout(() => router.push(`/login?error=${encodeURIComponent(error.message)}`), 1500);
        return;
      }

      if (session) {
        setStatus('Success! Redirecting...');
        // Clear hash from URL
        window.history.replaceState({}, '', window.location.pathname);

        // Check if running as installed PWA (needs transfer code)
        const isPWA = window.matchMedia('(display-mode: standalone)').matches
                   || (window.navigator as any).standalone === true;

        if (isPWA) {
          // PWA needs transfer code for cross-context auth
          router.push('/auth/transfer');
        } else {
          // Web users go directly to their destination
          const next = searchParams.get('next') || '/';
          router.push(next);
        }
      } else {
        setStatus('No session found. Redirecting...');
        setTimeout(() => router.push('/login'), 1500);
      }
    };

    handleAuth();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen-safe" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0a',
      color: '#fff',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #333',
          borderTopColor: '#FFD700',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1rem'
        }} />
        <p>{status}</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen-safe" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          color: '#fff',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #333',
            borderTopColor: '#FFD700',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
