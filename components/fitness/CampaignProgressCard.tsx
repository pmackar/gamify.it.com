'use client';

import { useFitnessStore } from '@/lib/fitness/store';

export function CampaignProgressCard({ onViewAll }: { onViewAll?: () => void }) {
  const store = useFitnessStore();
  const campaigns = store.campaigns || [];

  // Get active campaigns (not completed, with goals)
  const activeCampaigns = campaigns.filter(c => !c.completedAt && c.goals && c.goals.length > 0);

  if (activeCampaigns.length === 0) {
    return null; // Don't show empty state - let users discover campaigns naturally
  }

  // Get the most important campaign (closest to deadline or most progress)
  const primaryCampaign = activeCampaigns.sort((a, b) => {
    // Sort by target date (soonest first), then by progress
    if (a.targetDate && b.targetDate) {
      return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
    }
    if (a.targetDate) return -1;
    if (b.targetDate) return 1;
    return 0;
  })[0];

  // Calculate campaign progress
  const calculateProgress = (campaign: typeof primaryCampaign) => {
    if (!campaign.goals || campaign.goals.length === 0) return { percent: 0, achieved: 0, total: 0 };

    const achieved = campaign.goals.filter(g => {
      const currentPR = store.records[g.exerciseId] || 0;
      return currentPR >= g.targetWeight;
    }).length;

    const totalProgress = campaign.goals.reduce((acc, goal) => {
      const currentPR = store.records[goal.exerciseId] || 0;
      const progress = Math.min(100, (currentPR / goal.targetWeight) * 100);
      return acc + progress;
    }, 0);

    return {
      percent: Math.round(totalProgress / campaign.goals.length),
      achieved,
      total: campaign.goals.length,
    };
  };

  const progress = calculateProgress(primaryCampaign);

  // Calculate days remaining
  const getDaysRemaining = (targetDate?: string) => {
    if (!targetDate) return null;
    const target = new Date(targetDate);
    const now = new Date();
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const daysRemaining = getDaysRemaining(primaryCampaign.targetDate);

  return (
    <>
      <style jsx>{`
        .campaign-progress-card {
          background: linear-gradient(135deg, rgba(251, 146, 60, 0.12) 0%, rgba(245, 158, 11, 0.06) 100%);
          border: 1px solid rgba(251, 146, 60, 0.25);
          border-radius: 16px;
          padding: 14px 16px;
          margin: 0 16px 16px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .campaign-progress-card:hover {
          border-color: rgba(251, 146, 60, 0.4);
        }

        .campaign-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .campaign-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .campaign-icon {
          font-size: 16px;
        }

        .campaign-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #f59e0b;
        }

        .campaign-deadline {
          font-size: 11px;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .campaign-deadline.urgent {
          color: #ef4444;
          font-weight: 600;
        }

        .campaign-name {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 10px;
        }

        .campaign-progress-bar {
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .campaign-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%);
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .campaign-stats {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .campaign-percent {
          font-size: 14px;
          font-weight: 700;
          color: #f59e0b;
        }

        .campaign-goals-count {
          font-size: 12px;
          color: var(--text-muted);
        }

        .campaign-more {
          font-size: 11px;
          color: #f59e0b;
          margin-top: 10px;
          text-align: center;
          opacity: 0.8;
        }
      `}</style>

      <div className="campaign-progress-card" onClick={onViewAll}>
        <div className="campaign-header">
          <div className="campaign-header-left">
            <span className="campaign-icon">🎯</span>
            <span className="campaign-label">Active Campaign</span>
          </div>
          {daysRemaining !== null && (
            <span className={`campaign-deadline ${daysRemaining <= 7 ? 'urgent' : ''}`}>
              ⏰ {daysRemaining <= 0 ? 'Overdue!' : `${daysRemaining}d left`}
            </span>
          )}
        </div>

        <div className="campaign-name">{primaryCampaign.name}</div>

        <div className="campaign-progress-bar">
          <div
            className="campaign-progress-fill"
            style={{ width: `${progress.percent}%` }}
          />
        </div>

        <div className="campaign-stats">
          <span className="campaign-percent">{progress.percent}% Complete</span>
          <span className="campaign-goals-count">
            {progress.achieved}/{progress.total} goals achieved
          </span>
        </div>

        {activeCampaigns.length > 1 && (
          <div className="campaign-more">
            +{activeCampaigns.length - 1} more campaign{activeCampaigns.length > 2 ? 's' : ''}
          </div>
        )}
      </div>
    </>
  );
}
