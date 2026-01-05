'use client';

import { useState, useEffect } from 'react';

interface Partner {
  partnershipId: string;
  partnerId: string;
  name: string;
  avatar: string | null;
  userCheckedIn: boolean;
  partnerCheckedIn: boolean;
  bothCheckedIn: boolean;
  goals: Array<{
    id: string;
    title: string;
    target: number;
    userProgress: number;
    partnerProgress: number;
  }>;
}

interface AccountabilityData {
  partners: Partner[];
  pendingRequests: Array<{
    id: string;
    fromId: string;
    fromName: string;
    message?: string;
  }>;
}

export function AccountabilityCard() {
  const [data, setData] = useState<AccountabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [nudging, setNudging] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/fitness/accountability');
      if (!res.ok) return;
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch accountability data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (partnershipId: string) => {
    setChecking(true);
    try {
      const res = await fetch('/api/fitness/accountability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'checkin', partnershipId }),
      });
      if (res.ok) {
        fetchData();
      }
    } finally {
      setChecking(false);
    }
  };

  const handleNudge = async (partnershipId: string) => {
    setNudging(partnershipId);
    try {
      await fetch('/api/fitness/accountability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'nudge', partnershipId }),
      });
    } finally {
      setNudging(null);
    }
  };

  const handleRespond = async (partnershipId: string, accept: boolean) => {
    try {
      await fetch('/api/fitness/accountability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'respond', partnershipId, accept }),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to respond:', error);
    }
  };

  if (loading) return null;
  if (!data || (data.partners.length === 0 && data.pendingRequests.length === 0)) {
    return null;
  }

  return (
    <>
      <style jsx>{`
        .accountability-card {
          background: linear-gradient(135deg, rgba(95, 191, 138, 0.1) 0%, rgba(95, 191, 138, 0.05) 100%);
          border: 1px solid rgba(95, 191, 138, 0.3);
          border-radius: 16px;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }

        .card-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.55rem;
          color: var(--rpg-teal);
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .partner-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .partner-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 12px;
          padding: 0.75rem;
        }

        .partner-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--rpg-teal);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .partner-avatar img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }

        .partner-info {
          flex: 1;
          min-width: 0;
        }

        .partner-name {
          font-weight: 600;
          font-size: 0.85rem;
          color: var(--rpg-text);
        }

        .partner-status {
          font-size: 0.7rem;
          color: var(--rpg-muted);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.25rem;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-dot.checked {
          background: var(--rpg-teal);
          box-shadow: 0 0 6px var(--rpg-teal);
        }

        .status-dot.waiting {
          background: rgba(255, 255, 255, 0.3);
        }

        .partner-actions {
          display: flex;
          gap: 0.5rem;
        }

        .btn-checkin {
          padding: 0.5rem 0.75rem;
          background: linear-gradient(180deg, var(--rpg-teal) 0%, #4a9970 100%);
          border: none;
          border-radius: 8px;
          color: #000;
          font-size: 0.7rem;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-checkin:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-checkin.done {
          background: rgba(95, 191, 138, 0.2);
          color: var(--rpg-teal);
        }

        .btn-nudge {
          padding: 0.5rem;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
        }

        .btn-nudge:disabled {
          opacity: 0.5;
        }

        .request-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(255, 215, 0, 0.1);
          border: 1px dashed rgba(255, 215, 0, 0.3);
          border-radius: 12px;
          padding: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .request-actions {
          display: flex;
          gap: 0.5rem;
        }

        .btn-accept {
          padding: 0.4rem 0.6rem;
          background: var(--rpg-teal);
          border: none;
          border-radius: 6px;
          color: #000;
          font-size: 0.65rem;
          cursor: pointer;
        }

        .btn-decline {
          padding: 0.4rem 0.6rem;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          color: var(--rpg-muted);
          font-size: 0.65rem;
          cursor: pointer;
        }

        .both-checked {
          color: var(--rpg-gold);
          font-size: 0.65rem;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
      `}</style>

      <div className="accountability-card">
        <div className="card-header">
          <span className="card-title">
            <span>🤝</span>
            Accountability Partners
          </span>
        </div>

        {/* Pending Requests */}
        {data.pendingRequests.map(req => (
          <div key={req.id} className="request-item">
            <div className="partner-avatar">👤</div>
            <div className="partner-info">
              <div className="partner-name">{req.fromName}</div>
              <div className="partner-status">wants to be your partner</div>
            </div>
            <div className="request-actions">
              <button className="btn-accept" onClick={() => handleRespond(req.id, true)}>
                Accept
              </button>
              <button className="btn-decline" onClick={() => handleRespond(req.id, false)}>
                ✕
              </button>
            </div>
          </div>
        ))}

        {/* Active Partners */}
        <div className="partner-list">
          {data.partners.map(partner => (
            <div key={partner.partnershipId} className="partner-item">
              <div className="partner-avatar">
                {partner.avatar ? (
                  <img src={partner.avatar} alt="" />
                ) : (
                  '💪'
                )}
              </div>
              <div className="partner-info">
                <div className="partner-name">{partner.name}</div>
                <div className="partner-status">
                  <span className={`status-dot ${partner.userCheckedIn ? 'checked' : 'waiting'}`} />
                  You: {partner.userCheckedIn ? '✓' : 'waiting'}
                  <span className={`status-dot ${partner.partnerCheckedIn ? 'checked' : 'waiting'}`} />
                  Them: {partner.partnerCheckedIn ? '✓' : 'waiting'}
                </div>
                {partner.bothCheckedIn && (
                  <div className="both-checked">✨ Both checked in!</div>
                )}
              </div>
              <div className="partner-actions">
                {!partner.userCheckedIn ? (
                  <button
                    className="btn-checkin"
                    onClick={() => handleCheckIn(partner.partnershipId)}
                    disabled={checking}
                  >
                    Check In
                  </button>
                ) : (
                  <button className="btn-checkin done" disabled>
                    ✓ Done
                  </button>
                )}
                {!partner.partnerCheckedIn && partner.userCheckedIn && (
                  <button
                    className="btn-nudge"
                    onClick={() => handleNudge(partner.partnershipId)}
                    disabled={nudging === partner.partnershipId}
                    title="Send a nudge"
                  >
                    👋
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
