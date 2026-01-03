'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface Inviter {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface RedeemResult {
  message: string;
  inviter: Inviter;
  alreadyFriends?: boolean;
  alreadyPending?: boolean;
  autoAccepted?: boolean;
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [inviter, setInviter] = useState<Inviter | null>(null);
  const [status, setStatus] = useState<'loading' | 'validating' | 'ready' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState(false);

  // Check auth status
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthLoading(false);
    });
  }, []);

  // Validate code and get inviter info (even if not logged in)
  useEffect(() => {
    if (authLoading) return;

    async function validateCode() {
      setStatus('validating');
      try {
        // We need a separate endpoint to validate without auth
        const res = await fetch('/api/friends/invite/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        if (!res.ok) {
          const data = await res.json();
          setStatus('error');
          setMessage(data.error || 'Invalid invite code');
          return;
        }

        const data = await res.json();
        setInviter(data.inviter);
        setStatus('ready');
      } catch {
        setStatus('error');
        setMessage('Failed to validate invite code');
      }
    }

    validateCode();
  }, [code, authLoading]);

  // Auto-redeem if logged in and code is valid
  const handleRedeem = async () => {
    if (!user) {
      // Redirect to login with return URL
      const returnUrl = encodeURIComponent(window.location.pathname);
      router.push(`/login?returnUrl=${returnUrl}`);
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/friends/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data: RedeemResult = await res.json();

      if (!res.ok) {
        setStatus('error');
        setMessage(data.message || 'Failed to process invite');
        return;
      }

      setStatus('success');
      if (data.alreadyFriends) {
        setMessage(`You're already friends with ${data.inviter.display_name || 'this user'}!`);
      } else if (data.autoAccepted) {
        setMessage(`You're now friends with ${data.inviter.display_name || 'this user'}!`);
      } else if (data.alreadyPending) {
        setMessage(`Friend request already pending with ${data.inviter.display_name || 'this user'}`);
      } else {
        setMessage(`Friend request sent to ${data.inviter.display_name || 'this user'}!`);
      }

      // Redirect to friends page after a short delay
      setTimeout(() => {
        router.push('/friends');
      }, 2000);
    } catch {
      setStatus('error');
      setMessage('Something went wrong');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <style jsx>{`
        .invite-page {
          min-height: 100vh;
          min-height: 100dvh;
          background: var(--theme-bg, #0a0a0f);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .invite-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 32px;
          max-width: 400px;
          width: 100%;
          text-align: center;
        }

        .invite-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .invite-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 14px;
          color: var(--theme-gold, #FFD700);
          margin: 0 0 8px;
        }

        .invite-subtitle {
          font-size: 14px;
          color: var(--theme-text-muted, #888);
          margin-bottom: 24px;
        }

        .inviter-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .inviter-avatar {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #FFD700 0%, #E6A000 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Press Start 2P', monospace;
          font-size: 18px;
          color: #1a1a1a;
          flex-shrink: 0;
        }

        .inviter-avatar img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }

        .inviter-info {
          text-align: left;
        }

        .inviter-name {
          font-family: 'Press Start 2P', monospace;
          font-size: 10px;
          color: var(--theme-text, #fff);
          margin-bottom: 4px;
        }

        .inviter-username {
          font-size: 12px;
          color: var(--theme-text-muted, #888);
        }

        .invite-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(180deg, #FFD700 0%, #E6A000 100%);
          border: none;
          border-radius: 10px;
          color: #1a1a1a;
          font-family: 'Press Start 2P', monospace;
          font-size: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .invite-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(255, 215, 0, 0.3);
        }

        .invite-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .invite-btn.success {
          background: linear-gradient(180deg, #34c759 0%, #2da44e 100%);
        }

        .status-message {
          margin-top: 16px;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13px;
        }

        .status-message.error {
          background: rgba(255, 107, 107, 0.15);
          border: 1px solid rgba(255, 107, 107, 0.3);
          color: #ff6b6b;
        }

        .status-message.success {
          background: rgba(52, 199, 89, 0.15);
          border: 1px solid rgba(52, 199, 89, 0.3);
          color: #34c759;
        }

        .loading-spinner {
          display: inline-block;
          width: 24px;
          height: 24px;
          border: 3px solid rgba(255, 215, 0, 0.3);
          border-top-color: #FFD700;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .login-note {
          font-size: 12px;
          color: var(--theme-text-muted, #888);
          margin-top: 12px;
        }
      `}</style>

      <div className="invite-page">
        <div className="invite-card">
          {status === 'loading' || status === 'validating' ? (
            <>
              <div className="loading-spinner" />
              <p style={{ marginTop: '16px', color: '#888', fontSize: '13px' }}>
                Validating invite...
              </p>
            </>
          ) : status === 'error' ? (
            <>
              <div className="invite-icon">❌</div>
              <h1 className="invite-title">INVALID INVITE</h1>
              <div className="status-message error">{message}</div>
              <button
                className="invite-btn"
                onClick={() => router.push('/friends')}
                style={{ marginTop: '24px' }}
              >
                GO TO FRIENDS
              </button>
            </>
          ) : status === 'success' ? (
            <>
              <div className="invite-icon">🎉</div>
              <h1 className="invite-title">SUCCESS!</h1>
              <div className="status-message success">{message}</div>
              <p style={{ marginTop: '16px', color: '#888', fontSize: '12px' }}>
                Redirecting to friends...
              </p>
            </>
          ) : (
            <>
              <div className="invite-icon">🤝</div>
              <h1 className="invite-title">FRIEND INVITE</h1>
              <p className="invite-subtitle">
                You've been invited to connect!
              </p>

              {inviter && (
                <div className="inviter-card">
                  <div className="inviter-avatar">
                    {inviter.avatar_url ? (
                      <img src={inviter.avatar_url} alt="" />
                    ) : (
                      inviter.display_name?.charAt(0).toUpperCase() || '?'
                    )}
                  </div>
                  <div className="inviter-info">
                    <div className="inviter-name">
                      {inviter.display_name || 'Player'}
                    </div>
                    {inviter.username && (
                      <div className="inviter-username">@{inviter.username}</div>
                    )}
                  </div>
                </div>
              )}

              <button
                className="invite-btn"
                onClick={handleRedeem}
                disabled={processing}
              >
                {processing ? 'PROCESSING...' : user ? 'ACCEPT INVITE' : 'SIGN IN TO ACCEPT'}
              </button>

              {!user && (
                <p className="login-note">
                  You'll need to sign in or create an account to add friends
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
