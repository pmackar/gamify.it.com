'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { validatePassword, getPasswordStrengthLabel, getPasswordStrengthColor } from '@/lib/password-validation';
import type { User } from '@supabase/supabase-js';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPassword, setHasPassword] = useState(false);

  // Password form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password validation
  const validation = validatePassword(newPassword, user?.email || undefined);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/');
        return;
      }
      setUser(user);
      // Check if user has a password set by looking at identities
      // Users with password will have an 'email' identity provider
      const hasEmailIdentity = user.identities?.some(
        (identity) => identity.provider === 'email'
      );
      setHasPassword(!!hasEmailIdentity);
      setLoading(false);
    });
  }, [router]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validate password
    if (!validation.isValid) {
      setMessage({ type: 'error', text: validation.errors[0] });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setSaving(true);
    const supabase = createClient();

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ type: 'success', text: hasPassword ? 'Password updated successfully!' : 'Password set successfully! You can now log in with your email and password.' });
        setNewPassword('');
        setConfirmPassword('');
        setHasPassword(true);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-loading">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        .settings-page {
          min-height: 100vh;
          min-height: 100dvh;
          background: var(--theme-bg, #0a0a0f);
          padding: calc(80px + env(safe-area-inset-top, 0px)) 16px 40px;
        }

        .settings-container {
          max-width: 500px;
          margin: 0 auto;
        }

        .settings-header {
          margin-bottom: 32px;
        }

        .settings-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 16px;
          color: var(--theme-gold, #FFD700);
          margin: 0 0 8px;
        }

        .settings-subtitle {
          font-size: 13px;
          color: var(--theme-text-muted, #888);
        }

        .settings-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .settings-card-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 10px;
          color: var(--theme-text, #fff);
          margin: 0 0 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .settings-card-description {
          font-size: 13px;
          color: var(--theme-text-muted, #888);
          margin-bottom: 20px;
          line-height: 1.5;
        }

        .password-badge {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 8px;
          font-family: 'Press Start 2P', monospace;
        }

        .password-badge.set {
          background: rgba(52, 199, 89, 0.2);
          color: #34c759;
        }

        .password-badge.not-set {
          background: rgba(255, 107, 107, 0.2);
          color: #ff6b6b;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-label {
          display: block;
          font-family: 'Press Start 2P', monospace;
          font-size: 8px;
          color: var(--theme-text-muted, #888);
          margin-bottom: 8px;
        }

        .form-input-wrapper {
          position: relative;
        }

        .form-input {
          width: 100%;
          padding: 12px 40px 12px 14px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: var(--theme-text, #fff);
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }

        .form-input:focus {
          border-color: var(--theme-gold, #FFD700);
        }

        .form-input::placeholder {
          color: #555;
        }

        .toggle-password {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
          font-size: 16px;
          padding: 4px;
        }

        .toggle-password:hover {
          color: #888;
        }

        .strength-meter {
          margin-top: 8px;
        }

        .strength-bar {
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 6px;
        }

        .strength-fill {
          height: 100%;
          transition: width 0.3s, background 0.3s;
          border-radius: 2px;
        }

        .strength-label {
          font-size: 11px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .strength-text {
          font-family: 'Press Start 2P', monospace;
          font-size: 7px;
        }

        .validation-errors {
          margin-top: 8px;
        }

        .validation-error {
          font-size: 11px;
          color: #ff6b6b;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
        }

        .validation-suggestion {
          font-size: 11px;
          color: #888;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
        }

        .submit-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(180deg, #FFD700 0%, #E6A000 100%);
          border: none;
          border-radius: 8px;
          color: #1a1a1a;
          font-family: 'Press Start 2P', monospace;
          font-size: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .message {
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 12px;
          margin-bottom: 16px;
        }

        .message.success {
          background: rgba(52, 199, 89, 0.15);
          border: 1px solid rgba(52, 199, 89, 0.3);
          color: #34c759;
        }

        .message.error {
          background: rgba(255, 107, 107, 0.15);
          border: 1px solid rgba(255, 107, 107, 0.3);
          color: #ff6b6b;
        }

        .user-email {
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          font-size: 13px;
          color: var(--theme-text, #fff);
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .user-email-label {
          color: var(--theme-text-muted, #888);
          font-size: 11px;
        }

        .pwa-tip {
          background: rgba(95, 191, 138, 0.1);
          border: 1px solid rgba(95, 191, 138, 0.2);
          border-radius: 8px;
          padding: 16px;
          margin-top: 16px;
        }

        .pwa-tip-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 8px;
          color: #5fbf8a;
          margin-bottom: 8px;
        }

        .pwa-tip-text {
          font-size: 12px;
          color: #888;
          line-height: 1.5;
        }

        .settings-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 50vh;
          font-family: 'Press Start 2P', monospace;
          font-size: 12px;
          color: var(--theme-text-muted, #888);
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--theme-text-muted, #888);
          text-decoration: none;
          font-size: 13px;
          margin-bottom: 24px;
          transition: color 0.2s;
        }

        .back-link:hover {
          color: var(--theme-text, #fff);
        }

        .password-requirements {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          padding: 12px;
          margin-top: 12px;
        }

        .password-requirements-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 7px;
          color: var(--theme-text-muted, #888);
          margin-bottom: 8px;
        }

        .requirement {
          font-size: 11px;
          color: #666;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
        }

        .requirement.met {
          color: #34c759;
        }
      `}</style>

      <div className="settings-page">
        <div className="settings-container">
          <a href="/account" className="back-link">
            ← Back to Profile
          </a>

          <div className="settings-header">
            <h1 className="settings-title">SETTINGS</h1>
            <p className="settings-subtitle">Manage your account security</p>
          </div>

          <div className="settings-card">
            <h2 className="settings-card-title">
              🔒 PASSWORD
              <span className={`password-badge ${hasPassword ? 'set' : 'not-set'}`}>
                {hasPassword ? 'SET' : 'NOT SET'}
              </span>
            </h2>
            <p className="settings-card-description">
              {hasPassword
                ? 'Update your password for added security.'
                : 'Set a password to log in directly without needing a magic link. This is especially useful for the PWA app.'}
            </p>

            <div className="user-email">
              <span className="user-email-label">Email:</span>
              {user?.email}
            </div>

            {message && (
              <div className={`message ${message.type}`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSetPassword}>
              <div className="form-group">
                <label className="form-label">
                  {hasPassword ? 'NEW PASSWORD' : 'CREATE PASSWORD'}
                </label>
                <div className="form-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter a strong password"
                    className="form-input"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="toggle-password"
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>

                {newPassword && (
                  <>
                    <div className="strength-meter">
                      <div className="strength-bar">
                        <div
                          className="strength-fill"
                          style={{
                            width: `${(validation.score / 5) * 100}%`,
                            background: getPasswordStrengthColor(validation.score),
                          }}
                        />
                      </div>
                      <div className="strength-label">
                        <span
                          className="strength-text"
                          style={{ color: getPasswordStrengthColor(validation.score) }}
                        >
                          {getPasswordStrengthLabel(validation.score)}
                        </span>
                        <span style={{ color: '#666', fontSize: '10px' }}>
                          {newPassword.length} characters
                        </span>
                      </div>
                    </div>

                    <div className="validation-errors">
                      {validation.errors.map((error, i) => (
                        <div key={i} className="validation-error">
                          <span>✗</span> {error}
                        </div>
                      ))}
                      {validation.suggestions.map((suggestion, i) => (
                        <div key={i} className="validation-suggestion">
                          <span>💡</span> {suggestion}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div className="password-requirements">
                  <div className="password-requirements-title">REQUIREMENTS</div>
                  <div className={`requirement ${newPassword.length >= 10 ? 'met' : ''}`}>
                    {newPassword.length >= 10 ? '✓' : '○'} At least 10 characters
                  </div>
                  <div className={`requirement ${!/(password|123456|qwerty)/i.test(newPassword) && newPassword.length > 0 ? 'met' : ''}`}>
                    {!/(password|123456|qwerty)/i.test(newPassword) && newPassword.length > 0 ? '✓' : '○'} Not a common password
                  </div>
                  <div className={`requirement ${!/(.)\1{2,}/.test(newPassword) && newPassword.length > 0 ? 'met' : ''}`}>
                    {!/(.)\1{2,}/.test(newPassword) && newPassword.length > 0 ? '✓' : '○'} No repeating characters (aaa)
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">CONFIRM PASSWORD</label>
                <div className="form-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="form-input"
                    autoComplete="new-password"
                  />
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <div className="validation-errors">
                    <div className="validation-error">
                      <span>✗</span> Passwords do not match
                    </div>
                  </div>
                )}
                {confirmPassword && newPassword === confirmPassword && (
                  <div className="validation-errors">
                    <div className="validation-suggestion" style={{ color: '#34c759' }}>
                      <span>✓</span> Passwords match
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={saving || !validation.isValid || newPassword !== confirmPassword}
                className="submit-btn"
              >
                {saving ? 'SAVING...' : hasPassword ? 'UPDATE PASSWORD' : 'SET PASSWORD'}
              </button>
            </form>

            {!hasPassword && (
              <div className="pwa-tip">
                <div className="pwa-tip-title">💡 PWA TIP</div>
                <div className="pwa-tip-text">
                  Setting a password allows you to log in directly from the installed app without needing to check your email for magic links. Perfect for quick access!
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
