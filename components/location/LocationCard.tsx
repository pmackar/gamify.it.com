'use client';

import Link from 'next/link';
import { LocationListItem } from '@/types';
import { UserLocationActions } from './UserLocationActions';

interface LocationCardProps {
  location: LocationListItem;
  selected?: boolean;
  onClick?: () => void;
  showActions?: boolean;
  onUpdate?: () => void;
}

export function LocationCard({
  location,
  selected = false,
  onClick,
  showActions = true,
  onUpdate,
}: LocationCardProps) {
  const isVisited = location.userSpecific?.visited;
  const isHotlisted = location.userSpecific?.hotlist;

  return (
    <>
      <style jsx>{`
        .location-card {
          background: #2a2a2a;
          border: 2px solid #3a3a3a;
          border-radius: 8px;
          padding: 1rem;
          transition: all 0.2s;
          cursor: ${onClick ? 'pointer' : 'default'};
        }

        .location-card:hover {
          border-color: #4a4a4a;
        }

        .location-card.selected {
          border-color: #FFD700;
          box-shadow: 0 0 12px rgba(255, 215, 0, 0.3);
        }

        .location-card.visited {
          border-left: 4px solid #00ff00;
        }

        .location-card.hotlisted:not(.visited) {
          border-left: 4px solid #ff4444;
        }

        .card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .location-name {
          font-size: 0.6rem;
          color: #fff;
          text-decoration: none;
          transition: color 0.2s;
        }

        .location-name:hover {
          color: #FFD700;
        }

        .category-badge {
          font-size: 0.35rem;
          padding: 0.25rem 0.5rem;
          background: #1a1a1a;
          border: 1px solid #3a3a3a;
          border-radius: 4px;
          color: #888;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .location-meta {
          font-size: 0.45rem;
          color: #888;
          margin-bottom: 0.75rem;
        }

        .location-description {
          font-size: 0.4rem;
          color: #666;
          line-height: 1.8;
          margin-bottom: 0.75rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .location-stats {
          display: flex;
          gap: 1rem;
          font-size: 0.4rem;
          color: #888;
          margin-bottom: 0.75rem;
          flex-wrap: wrap;
        }

        .stat {
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        .stat-icon {
          font-size: 0.6rem;
        }

        .stat.rating {
          color: #FFD700;
        }

        .stat.visits {
          color: #00ff00;
        }

        .stat.distance {
          color: #4facfe;
        }

        .user-rating {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.35rem;
          padding: 0.2rem 0.4rem;
          background: rgba(255, 215, 0, 0.1);
          border: 1px solid rgba(255, 215, 0, 0.3);
          border-radius: 4px;
          color: #FFD700;
          margin-left: 0.5rem;
        }

        .card-footer {
          padding-top: 0.75rem;
          border-top: 1px solid #3a3a3a;
        }

        .photo-preview {
          width: 100%;
          height: 120px;
          object-fit: cover;
          border-radius: 4px;
          margin-bottom: 0.75rem;
          background: #1a1a1a;
        }

        .badges {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .badge {
          font-size: 0.3rem;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .badge.visited-badge {
          background: rgba(0, 255, 0, 0.1);
          border: 1px solid rgba(0, 255, 0, 0.3);
          color: #00ff00;
        }

        .badge.hotlist-badge {
          background: rgba(255, 68, 68, 0.1);
          border: 1px solid rgba(255, 68, 68, 0.3);
          color: #ff4444;
        }
      `}</style>

      <div
        className={`location-card ${selected ? 'selected' : ''} ${isVisited ? 'visited' : ''} ${isHotlisted && !isVisited ? 'hotlisted' : ''}`}
        onClick={onClick}
      >
        {location.photoUrl && (
          <img
            src={location.photoUrl}
            alt={location.name}
            className="photo-preview"
          />
        )}

        {(isVisited || isHotlisted) && (
          <div className="badges">
            {isVisited && <span className="badge visited-badge">Visited</span>}
            {isHotlisted && <span className="badge hotlist-badge">Saved</span>}
          </div>
        )}

        <div className="card-header">
          <Link href={`/locations/${location.id}`} className="location-name">
            {location.name}
          </Link>
          <span className="category-badge">{location.category.toLowerCase().replace('_', ' ')}</span>
        </div>

        <p className="location-meta">
          {location.city}
          {location.state ? `, ${location.state}` : ''}
        </p>

        {location.description && (
          <p className="location-description">{location.description}</p>
        )}

        <div className="location-stats">
          <span className="stat visits">
            <span className="stat-icon">👁️</span>
            {location.totalVisits} visits
          </span>

          {location.averageRating && (
            <span className="stat rating">
              <span className="stat-icon">⭐</span>
              {location.averageRating.toFixed(1)}
              {location.userSpecific?.rating && (
                <span className="user-rating">
                  You: {location.userSpecific.rating}/5
                </span>
              )}
            </span>
          )}

          {location.distanceKm !== undefined && (
            <span className="stat distance">
              <span className="stat-icon">📍</span>
              {location.distanceKm.toFixed(1)} km
            </span>
          )}

          {location.totalReviews > 0 && (
            <span className="stat">
              <span className="stat-icon">💬</span>
              {location.totalReviews} reviews
            </span>
          )}
        </div>

        {showActions && (
          <div className="card-footer">
            <UserLocationActions
              locationId={location.id}
              initialData={location.userSpecific ? {
                hotlist: location.userSpecific.hotlist,
                visited: location.userSpecific.visited,
                rating: location.userSpecific.rating,
              } : undefined}
              compact
              onUpdate={onUpdate}
            />
          </div>
        )}
      </div>
    </>
  );
}

export default LocationCard;
