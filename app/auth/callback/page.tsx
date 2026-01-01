'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function AuthCallback() {
  const [status, setStatus] = useState('Processing...');
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      const supabase = createClient();

      // Check URL hash for tokens (implicit flow)
      const hash = window.location.hash;
      console.log('Auth callback - hash:', hash);
      console.log('Auth callback - search:', window.location.search);

      // Try to get session (handles both flows)
      const { data: { session }, error } = await supabase.auth.getSession();

      console.log('Auth callback - session:', !!session, 'error:', error?.message);

      if (error) {
        setStatus(`Error: ${error.message}`);
        setTimeout(() => router.push(`/?error=${encodeURIComponent(error.message)}`), 2000);
        return;
      }

      if (session) {
        setStatus('Authenticated! Redirecting...');
        // Clear hash from URL
        window.history.replaceState({}, '', window.location.pathname);
        router.push('/auth/transfer');
      } else {
        setStatus('No session found. Redirecting...');
        setTimeout(() => router.push('/'), 2000);
      }
    };

    handleAuth();
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
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
