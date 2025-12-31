'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useRef, useState } from 'react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        skipBrowserRedirect: true,
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setIsLoading(false);
      return;
    }

    if (data?.url) {
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      popupRef.current = window.open(
        data.url,
        'google-oauth',
        `width=${width},height=${height},left=${left},top=${top},popup=true`
      );

      checkIntervalRef.current = setInterval(async () => {
        if (popupRef.current?.closed) {
          clearInterval(checkIntervalRef.current!);
          // Wait a moment for cookies to sync, then refresh session
          await new Promise(resolve => setTimeout(resolve, 500));
          await supabase.auth.refreshSession();
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setIsLoading(false);
            onSuccess?.();
            onClose();
          } else {
            setIsLoading(false);
          }
        }
      }, 500);
    }
  };

  useEffect(() => {
    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      if (popupRef.current && !popupRef.current.closed) popupRef.current.close();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setIsLoading(false);
        onSuccess?.();
        onClose();
      }
    });
    return () => subscription.unsubscribe();
  }, [isOpen, onClose, onSuccess]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm" onClick={onClose} style={{ animation: 'fadeIn 0.2s ease-out' }} />
      <div className="fixed left-1/2 top-1/2 z-[201] w-full max-w-md -translate-x-1/2 -translate-y-1/2 p-4" style={{ animation: 'slideUp 0.3s ease-out' }}>
        <div style={{ background: '#2d2d2d', border: '2px solid #3a3a3a', borderRadius: '12px', padding: '2rem', boxShadow: '0 8px 0 #1a1a1a', fontFamily: "'Press Start 2P', monospace", position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#666', fontSize: '1rem', cursor: 'pointer' }}>✕</button>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ color: '#FFD700', fontSize: '0.9rem', marginBottom: '0.5rem' }}>SIGN IN</h2>
            <p style={{ color: '#888', fontSize: '0.5rem', lineHeight: '1.8' }}>Join the adventure</p>
          </div>
          {error && <div style={{ background: 'rgba(255,107,107,0.2)', border: '1px solid rgba(255,107,107,0.4)', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', color: '#ff6b6b', fontSize: '0.45rem', textAlign: 'center' }}>{error}</div>}
          <button onClick={handleGoogleLogin} disabled={isLoading} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1rem', background: 'white', border: '2px solid #ddd', borderRadius: '8px', color: '#333', fontSize: '0.5rem', cursor: isLoading ? 'wait' : 'pointer', opacity: isLoading ? 0.7 : 1 }}>
            {isLoading ? <div style={{ width: '20px', height: '20px', border: '2px solid #ddd', borderTopColor: '#333', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : (
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {isLoading ? 'SIGNING IN...' : 'CONTINUE WITH GOOGLE'}
          </button>
          <p style={{ marginTop: '1.5rem', textAlign: 'center', color: '#666', fontSize: '0.4rem', lineHeight: '1.8' }}>By signing in, you agree to our Terms of Service</p>
        </div>
      </div>
      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translate(-50%, -45%); } to { opacity: 1; transform: translate(-50%, -50%); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
