'use client';

import { useState, useOptimistic, useTransition } from 'react';
import {
  toggleHotlist,
  markAsVisited,
  unmarkAsVisited,
  rateLocation,
  removeRating,
  updateNotes,
} from '@/app/actions/location-actions';

interface UserLocationActionsProps {
  locationId: string;
  initialData?: {
    hotlist?: boolean;
    visited?: boolean;
    rating?: number | null;
    notes?: string | null;
    visitCount?: number;
  };
  compact?: boolean;
  showNotes?: boolean;
  onUpdate?: () => void;
}

export function UserLocationActions({
  locationId,
  initialData = {},
  compact = false,
  showNotes = false,
  onUpdate,
}: UserLocationActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notes, setNotes] = useState(initialData.notes || '');

  // Optimistic updates
  const [optimisticHotlist, setOptimisticHotlist] = useOptimistic(
    initialData.hotlist || false
  );
  const [optimisticVisited, setOptimisticVisited] = useOptimistic(
    initialData.visited || false
  );
  const [optimisticRating, setOptimisticRating] = useOptimistic(
    initialData.rating || null
  );

  const handleHotlistToggle = () => {
    startTransition(async () => {
      setOptimisticHotlist(!optimisticHotlist);
      await toggleHotlist(locationId);
      onUpdate?.();
    });
  };

  const handleVisitedToggle = () => {
    startTransition(async () => {
      if (optimisticVisited) {
        setOptimisticVisited(false);
        await unmarkAsVisited(locationId);
      } else {
        setOptimisticVisited(true);
        await markAsVisited(locationId);
      }
      onUpdate?.();
    });
  };

  const handleRating = (rating: number) => {
    startTransition(async () => {
      setOptimisticRating(rating);
      await rateLocation(locationId, rating);
      setShowRatingModal(false);
      onUpdate?.();
    });
  };

  const handleRemoveRating = () => {
    startTransition(async () => {
      setOptimisticRating(null);
      await removeRating(locationId);
      setShowRatingModal(false);
      onUpdate?.();
    });
  };

  const handleSaveNotes = () => {
    startTransition(async () => {
      await updateNotes(locationId, notes);
      setShowNotesModal(false);
      onUpdate?.();
    });
  };

  return (
    <>
      <style jsx>{`
        .user-actions {
          display: flex;
          gap: ${compact ? '0.5rem' : '0.75rem'};
          flex-wrap: wrap;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: ${compact ? '0.4rem 0.6rem' : '0.5rem 0.75rem'};
          font-family: 'Press Start 2P', monospace;
          font-size: ${compact ? '0.35rem' : '0.4rem'};
          background: #1a1a1a;
          border: 2px solid #3a3a3a;
          border-radius: 4px;
          color: #888;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:hover:not(:disabled) {
          background: #2a2a2a;
          color: #fff;
          border-color: #4a4a4a;
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .action-btn.hotlist-active {
          border-color: #ff4444;
          color: #ff4444;
          box-shadow: 0 0 8px rgba(255, 68, 68, 0.3);
        }

        .action-btn.visited-active {
          border-color: #00ff00;
          color: #00ff00;
          box-shadow: 0 0 8px rgba(0, 255, 0, 0.3);
        }

        .action-btn.rated {
          border-color: #FFD700;
          color: #FFD700;
          box-shadow: 0 0 8px rgba(255, 215, 0, 0.3);
        }

        .action-icon {
          font-size: ${compact ? '0.7rem' : '0.9rem'};
        }

        /* Rating Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: #1a1a1a;
          border: 2px solid #3a3a3a;
          border-radius: 8px;
          padding: 1.5rem;
          max-width: 400px;
          width: 90%;
        }

        .modal-title {
          font-size: 0.6rem;
          color: #FFD700;
          margin-bottom: 1rem;
          text-align: center;
        }

        .rating-stars {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .star-btn {
          font-size: 1.5rem;
          background: none;
          border: none;
          cursor: pointer;
          transition: transform 0.2s;
          filter: grayscale(100%);
        }

        .star-btn:hover {
          transform: scale(1.2);
        }

        .star-btn.active {
          filter: none;
        }

        .modal-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
          margin-top: 1rem;
        }

        .modal-btn {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.4rem;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .modal-btn-primary {
          background: #FFD700;
          border: 2px solid #CC8800;
          color: #1a1a1a;
        }

        .modal-btn-secondary {
          background: #2a2a2a;
          border: 2px solid #3a3a3a;
          color: #888;
        }

        .modal-btn:hover {
          transform: translateY(-1px);
        }

        /* Notes Modal */
        .notes-textarea {
          width: 100%;
          min-height: 120px;
          background: #0a0a0a;
          border: 2px solid #3a3a3a;
          border-radius: 4px;
          padding: 0.75rem;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.4rem;
          color: #fff;
          resize: vertical;
          line-height: 1.8;
        }

        .notes-textarea:focus {
          outline: none;
          border-color: #FFD700;
        }

        .notes-hint {
          font-size: 0.35rem;
          color: #666;
          margin-top: 0.5rem;
          text-align: center;
        }
      `}</style>

      <div className="user-actions">
        <button
          className={`action-btn ${optimisticHotlist ? 'hotlist-active' : ''}`}
          onClick={handleHotlistToggle}
          disabled={isPending}
          title={optimisticHotlist ? 'Remove from hotlist' : 'Add to hotlist'}
        >
          <span className="action-icon">{optimisticHotlist ? '❤️' : '🤍'}</span>
          {!compact && <span>{optimisticHotlist ? 'Saved' : 'Save'}</span>}
        </button>

        <button
          className={`action-btn ${optimisticVisited ? 'visited-active' : ''}`}
          onClick={handleVisitedToggle}
          disabled={isPending}
          title={optimisticVisited ? 'Mark as not visited' : 'Mark as visited'}
        >
          <span className="action-icon">{optimisticVisited ? '✓' : '📍'}</span>
          {!compact && <span>{optimisticVisited ? 'Visited' : 'Check In'}</span>}
        </button>

        <button
          className={`action-btn ${optimisticRating ? 'rated' : ''}`}
          onClick={() => setShowRatingModal(true)}
          disabled={isPending}
          title="Rate this location"
        >
          <span className="action-icon">⭐</span>
          {!compact && <span>{optimisticRating ? `${optimisticRating}/5` : 'Rate'}</span>}
        </button>

        {showNotes && (
          <button
            className="action-btn"
            onClick={() => setShowNotesModal(true)}
            disabled={isPending}
            title="Add personal notes"
          >
            <span className="action-icon">📝</span>
            {!compact && <span>Notes</span>}
          </button>
        )}
      </div>

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="modal-overlay" onClick={() => setShowRatingModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Rate this location</h3>
            <div className="rating-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  className={`star-btn ${star <= (optimisticRating || 0) ? 'active' : ''}`}
                  onClick={() => handleRating(star)}
                >
                  ⭐
                </button>
              ))}
            </div>
            <div className="modal-actions">
              {optimisticRating && (
                <button className="modal-btn modal-btn-secondary" onClick={handleRemoveRating}>
                  Clear
                </button>
              )}
              <button className="modal-btn modal-btn-secondary" onClick={() => setShowRatingModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && (
        <div className="modal-overlay" onClick={() => setShowNotesModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Personal Notes</h3>
            <textarea
              className="notes-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your private notes about this place..."
            />
            <p className="notes-hint">Only you can see these notes</p>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-secondary" onClick={() => setShowNotesModal(false)}>
                Cancel
              </button>
              <button className="modal-btn modal-btn-primary" onClick={handleSaveNotes}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default UserLocationActions;
