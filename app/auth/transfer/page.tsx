'use client';

import { useState, useEffect } from 'react';

export default function TransferPage() {
  const [code, setCode] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const generateCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/transfer-code', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setCode(data.code);
        setEmail(data.email);
        setTimeLeft(data.expiresIn);
      } else {
        setError(data.error || 'Failed to generate code');
      }
    } catch (e) {
      setError('Network error');
    }
    setLoading(false);
  };

  useEffect(() => {
    generateCode();
  }, []);

  useEffect(() => {
    if (timeLeft <= 0 || !code) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setCode(null);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [code, timeLeft]);

  return (
    <div className="transfer-page">
      <div className="transfer-card">
        <div className="transfer-icon">✓</div>
        <h1 className="transfer-title">Logged In!</h1>
        {email && <p className="transfer-email">{email}</p>}

        {loading ? (
          <div className="transfer-loading">
            <div className="spinner" />
            <p>Generating code...</p>
          </div>
        ) : error ? (
          <div className="transfer-error">
            <p>{error}</p>
            <button onClick={generateCode} className="transfer-btn">
              Try Again
            </button>
          </div>
        ) : code ? (
          <div className="transfer-code-section">
            <p className="transfer-label">Enter this code in the PWA:</p>
            <div className="transfer-code">{code}</div>
            <div className="transfer-timer">
              Expires in {timeLeft}s
            </div>
            <button onClick={generateCode} className="transfer-btn-secondary">
              Generate New Code
            </button>
          </div>
        ) : (
          <div className="transfer-expired">
            <p>Code expired</p>
            <button onClick={generateCode} className="transfer-btn">
              Generate New Code
            </button>
          </div>
        )}

        <a href="/" className="transfer-link">
          Continue to website →
        </a>
      </div>

      <style jsx>{`
        .transfer-page {
          min-height: 100vh;
          min-height: 100dvh;
          background: linear-gradient(180deg, #0a0a0a 0%, #121218 50%, #0a0a0a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .transfer-card {
          background: rgba(30, 30, 40, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 2.5rem;
          text-align: center;
          max-width: 340px;
          width: 100%;
        }
        .transfer-icon {
          width: 60px;
          height: 60px;
          margin: 0 auto 1rem;
          background: linear-gradient(135deg, #5fbf8a, #4a9d70);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          color: white;
        }
        .transfer-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 1rem;
          color: #5fbf8a;
          margin-bottom: 0.5rem;
        }
        .transfer-email {
          color: #888;
          font-size: 0.9rem;
          margin-bottom: 1.5rem;
        }
        .transfer-label {
          color: #aaa;
          font-size: 0.85rem;
          margin-bottom: 1rem;
        }
        .transfer-code {
          font-family: 'SF Mono', 'Menlo', monospace;
          font-size: 2.5rem;
          letter-spacing: 0.5rem;
          color: #FFD700;
          background: rgba(0, 0, 0, 0.3);
          border: 2px solid rgba(255, 215, 0, 0.3);
          border-radius: 12px;
          padding: 1rem 1.5rem;
          margin-bottom: 0.75rem;
          text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
        }
        .transfer-timer {
          color: #666;
          font-size: 0.8rem;
          margin-bottom: 1.5rem;
        }
        .transfer-loading {
          padding: 2rem 0;
        }
        .spinner {
          width: 30px;
          height: 30px;
          border: 3px solid #333;
          border-top-color: #FFD700;
          border-radius: 50%;
          margin: 0 auto 1rem;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .transfer-loading p {
          color: #888;
          font-size: 0.85rem;
        }
        .transfer-error {
          padding: 1rem 0;
        }
        .transfer-error p {
          color: #ff6b6b;
          margin-bottom: 1rem;
        }
        .transfer-expired p {
          color: #888;
          margin-bottom: 1rem;
        }
        .transfer-btn {
          background: linear-gradient(135deg, #FFD700, #FFA500);
          border: none;
          border-radius: 10px;
          padding: 0.75rem 1.5rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: #1a1a1a;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .transfer-btn:hover {
          transform: translateY(-2px);
        }
        .transfer-btn-secondary {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          padding: 0.6rem 1.25rem;
          font-size: 0.8rem;
          color: #888;
          cursor: pointer;
          transition: all 0.2s;
        }
        .transfer-btn-secondary:hover {
          border-color: rgba(255, 255, 255, 0.4);
          color: #aaa;
        }
        .transfer-link {
          display: block;
          margin-top: 2rem;
          color: #5CC9F5;
          text-decoration: none;
          font-size: 0.85rem;
        }
        .transfer-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
