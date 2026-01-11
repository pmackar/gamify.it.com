'use client';

import { useState, useEffect } from 'react';

interface DuplicateAccount {
  id: string;
  username: string | null;
  xp: number | null;
  level: number | null;
  workoutCount: number;
  createdAt: string;
}

export function AccountMergeBanner() {
  const [duplicate, setDuplicate] = useState<DuplicateAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check if user has dismissed this before
    const wasDismissed = localStorage.getItem('merge-banner-dismissed');
    if (wasDismissed) {
      setDismissed(true);
      setLoading(false);
      return;
    }

    checkForDuplicates();
  }, []);

  const checkForDuplicates = async () => {
    try {
      const res = await fetch('/api/auth/merge-accounts');
      if (res.ok) {
        const data = await res.json();
        setDuplicate(data.duplicateAccount);
      }
    } catch (err) {
      console.error('Failed to check for duplicates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMerge = async () => {
    if (!duplicate) return;

    setMerging(true);
    setError('');

    try {
      const res = await fetch('/api/auth/merge-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldUserId: duplicate.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to merge accounts');
      }

      setSuccess(true);
      setDuplicate(null);

      // Refresh the page after a short delay to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to merge accounts');
    } finally {
      setMerging(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('merge-banner-dismissed', 'true');
    setDismissed(true);
  };

  if (loading || dismissed || !duplicate) return null;

  if (success) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(95, 191, 138, 0.15) 0%, rgba(95, 191, 138, 0.05) 100%)',
        border: '1px solid rgba(95, 191, 138, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        margin: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <span style={{ fontSize: '24px' }}>✅</span>
        <div>
          <p style={{ color: '#5fbf8a', fontWeight: '600', margin: 0 }}>
            Accounts merged successfully!
          </p>
          <p style={{ color: '#888', fontSize: '14px', margin: '4px 0 0' }}>
            Refreshing to show your data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 165, 0, 0.08) 100%)',
      border: '1px solid rgba(255, 215, 0, 0.3)',
      borderRadius: '12px',
      padding: '16px',
      margin: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span style={{ fontSize: '24px' }}>⚠️</span>
        <div style={{ flex: 1 }}>
          <p style={{ color: '#FFD700', fontWeight: '600', margin: '0 0 8px' }}>
            Existing account found
          </p>
          <p style={{ color: '#ccc', fontSize: '14px', margin: '0 0 12px', lineHeight: '1.5' }}>
            You have an existing account with {duplicate.xp || 0} XP
            {duplicate.workoutCount > 0 && ` and ${duplicate.workoutCount} workouts`}.
            Would you like to merge it with this account?
          </p>

          {error && (
            <p style={{
              color: '#ff6b6b',
              fontSize: '13px',
              margin: '0 0 12px',
              padding: '8px 12px',
              background: 'rgba(255, 107, 107, 0.1)',
              borderRadius: '6px',
            }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handleMerge}
              disabled={merging}
              style={{
                padding: '10px 20px',
                background: merging ? '#666' : 'linear-gradient(180deg, #FFD700 0%, #FFA500 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#1a1a1a',
                fontWeight: '600',
                fontSize: '14px',
                cursor: merging ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {merging ? (
                <>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid #333',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }} />
                  Merging...
                </>
              ) : (
                <>
                  <span>🔗</span>
                  Merge Accounts
                </>
              )}
            </button>

            <button
              onClick={handleDismiss}
              disabled={merging}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#888',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Not now
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
