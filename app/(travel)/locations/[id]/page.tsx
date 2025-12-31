'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { UserLocationActions } from '@/components/location/UserLocationActions';

const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => <div className="map-loading">Loading map...</div>,
});

interface LocationDetail {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  neighborhood: string | null;
  latitude: number;
  longitude: number;
  category: string;
  tags: string[];
  photoUrl: string | null;
  website: string | null;
  phone: string | null;
  averageRating: number | null;
  totalVisits: number;
  totalReviews: number;
  totalRatings: number;
  createdBy: {
    id: string;
    username: string | null;
    avatarUrl: string | null;
  };
  reviews: Array<{
    id: string;
    title: string | null;
    content: string;
    rating: number;
    createdAt: string;
    author: {
      id: string;
      username: string | null;
      avatarUrl: string | null;
    };
  }>;
  userSpecific?: {
    hotlist: boolean;
    visited: boolean;
    rating: number | null;
    notes: string | null;
    visitCount: number;
    firstVisitedAt: string | null;
    lastVisitedAt: string | null;
  };
}

export default function LocationDetailPage() {
  const params = useParams();
  const locationId = params.id as string;
  const [location, setLocation] = useState<LocationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocation = async () => {
    try {
      const res = await fetch(`/api/locations/${locationId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Location not found');
        } else {
          setError('Failed to load location');
        }
        return;
      }
      const data = await res.json();
      setLocation(data.data);
    } catch (err) {
      setError('Failed to load location');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocation();
  }, [locationId]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error || !location) {
    return (
      <div className="error-state">
        <h2>{error || 'Location not found'}</h2>
        <Link href="/locations">Back to Locations</Link>
      </div>
    );
  }

  const mapLocations = [{
    id: location.id,
    name: location.name,
    description: location.description,
    city: location.city,
    state: location.state,
    category: location.category as any,
    latitude: location.latitude,
    longitude: location.longitude,
    photoUrl: location.photoUrl,
    averageRating: location.averageRating,
    totalVisits: location.totalVisits,
    totalReviews: location.totalReviews,
    userSpecific: location.userSpecific ? {
      hotlist: location.userSpecific.hotlist,
      visited: location.userSpecific.visited,
      rating: location.userSpecific.rating,
    } : null,
  }];

  return (
    <>
      <style jsx>{`
        .location-container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        .loading, .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 50vh;
          text-align: center;
          color: #888;
          font-size: 0.5rem;
          gap: 1rem;
        }

        .error-state h2 {
          font-size: 0.7rem;
          color: #ff4444;
        }

        .error-state a {
          color: #FFD700;
        }

        .back-link {
          font-size: 0.4rem;
          color: #888;
          text-decoration: none;
          margin-bottom: 1rem;
          display: inline-block;
        }

        .back-link:hover {
          color: #FFD700;
        }

        .location-hero {
          position: relative;
          height: 300px;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 1.5rem;
          background: #1a1a1a;
        }

        .hero-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .hero-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
        }

        .location-header {
          margin-bottom: 1.5rem;
        }

        .category-badge {
          display: inline-block;
          font-size: 0.35rem;
          padding: 0.3rem 0.6rem;
          background: rgba(255, 215, 0, 0.1);
          border: 1px solid rgba(255, 215, 0, 0.3);
          border-radius: 4px;
          color: #FFD700;
          text-transform: uppercase;
          margin-bottom: 0.75rem;
        }

        .location-name {
          font-size: 1rem;
          color: #fff;
          margin-bottom: 0.5rem;
        }

        .location-address {
          font-size: 0.45rem;
          color: #888;
          margin-bottom: 1rem;
        }

        .location-stats {
          display: flex;
          gap: 1.5rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }

        .stat {
          font-size: 0.45rem;
          color: #888;
        }

        .stat-value {
          color: #FFD700;
          margin-right: 0.3rem;
        }

        .actions-section {
          padding: 1rem;
          background: #1a1a1a;
          border: 2px solid #2a2a2a;
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }

        .content-grid {
          display: grid;
          gap: 1.5rem;
        }

        @media (min-width: 768px) {
          .content-grid {
            grid-template-columns: 2fr 1fr;
          }
        }

        .main-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .section {
          background: #1a1a1a;
          border: 2px solid #2a2a2a;
          border-radius: 8px;
          padding: 1rem;
        }

        .section-title {
          font-size: 0.55rem;
          color: #FFD700;
          margin-bottom: 0.75rem;
        }

        .description {
          font-size: 0.45rem;
          color: #ccc;
          line-height: 2;
        }

        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .tag {
          font-size: 0.35rem;
          padding: 0.25rem 0.5rem;
          background: #2a2a2a;
          border-radius: 4px;
          color: #888;
        }

        .info-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .info-item {
          font-size: 0.4rem;
          color: #888;
        }

        .info-item a {
          color: #5fbf8a;
          text-decoration: none;
        }

        .info-item a:hover {
          text-decoration: underline;
        }

        .sidebar {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .map-container {
          height: 200px;
          border-radius: 8px;
          overflow: hidden;
          border: 2px solid #2a2a2a;
        }

        .map-loading {
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1a1a1a;
          color: #888;
          font-size: 0.4rem;
        }

        .creator-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: #1a1a1a;
          border: 2px solid #2a2a2a;
          border-radius: 8px;
          text-decoration: none;
        }

        .creator-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #2a2a2a;
          object-fit: cover;
        }

        .creator-info {
          flex: 1;
        }

        .creator-label {
          font-size: 0.35rem;
          color: #888;
        }

        .creator-name {
          font-size: 0.45rem;
          color: #fff;
        }

        .reviews-section {
          margin-top: 2rem;
        }

        .review-card {
          padding: 1rem;
          background: #1a1a1a;
          border: 2px solid #2a2a2a;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .review-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .review-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #2a2a2a;
        }

        .review-author {
          font-size: 0.45rem;
          color: #fff;
        }

        .review-rating {
          font-size: 0.4rem;
          color: #FFD700;
          margin-left: auto;
        }

        .review-content {
          font-size: 0.4rem;
          color: #ccc;
          line-height: 1.8;
        }

        .review-date {
          font-size: 0.35rem;
          color: #666;
          margin-top: 0.5rem;
        }

        .no-reviews {
          font-size: 0.45rem;
          color: #888;
          text-align: center;
          padding: 2rem;
        }
      `}</style>

      <div className="location-container">
        <Link href="/locations" className="back-link">
          &larr; Back to Locations
        </Link>

        <div className="location-hero">
          {location.photoUrl ? (
            <img src={location.photoUrl} alt={location.name} className="hero-image" />
          ) : (
            <div className="hero-placeholder">📍</div>
          )}
        </div>

        <div className="location-header">
          <span className="category-badge">{location.category.toLowerCase().replace('_', ' ')}</span>
          <h1 className="location-name">{location.name}</h1>
          <p className="location-address">
            {location.address && `${location.address}, `}
            {location.city}
            {location.state && `, ${location.state}`}
            {location.neighborhood && ` · ${location.neighborhood}`}
          </p>

          <div className="location-stats">
            <span className="stat">
              <span className="stat-value">{location.totalVisits}</span> visits
            </span>
            {location.averageRating && (
              <span className="stat">
                <span className="stat-value">⭐ {location.averageRating.toFixed(1)}</span>
                ({location.totalRatings} ratings)
              </span>
            )}
            <span className="stat">
              <span className="stat-value">{location.totalReviews}</span> reviews
            </span>
          </div>
        </div>

        <div className="actions-section">
          <UserLocationActions
            locationId={location.id}
            initialData={location.userSpecific}
            showNotes
            onUpdate={fetchLocation}
          />
        </div>

        <div className="content-grid">
          <div className="main-content">
            {location.description && (
              <div className="section">
                <h2 className="section-title">About</h2>
                <p className="description">{location.description}</p>
              </div>
            )}

            {location.tags.length > 0 && (
              <div className="section">
                <h2 className="section-title">Tags</h2>
                <div className="tags">
                  {location.tags.map((tag) => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {(location.website || location.phone) && (
              <div className="section">
                <h2 className="section-title">Contact</h2>
                <div className="info-list">
                  {location.website && (
                    <div className="info-item">
                      🌐 <a href={location.website} target="_blank" rel="noopener noreferrer">
                        {location.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                  {location.phone && (
                    <div className="info-item">
                      📞 <a href={`tel:${location.phone}`}>{location.phone}</a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="sidebar">
            <div className="map-container">
              <MapView locations={mapLocations} interactive={false} />
            </div>

            <Link href={`/profile/${location.createdBy.id}`} className="creator-card">
              {location.createdBy.avatarUrl ? (
                <img
                  src={location.createdBy.avatarUrl}
                  alt="Creator"
                  className="creator-avatar"
                />
              ) : (
                <div className="creator-avatar" />
              )}
              <div className="creator-info">
                <div className="creator-label">Added by</div>
                <div className="creator-name">
                  {location.createdBy.username || 'Explorer'}
                </div>
              </div>
            </Link>
          </div>
        </div>

        <div className="reviews-section">
          <div className="section">
            <h2 className="section-title">Reviews ({location.reviews.length})</h2>
            {location.reviews.length === 0 ? (
              <p className="no-reviews">No reviews yet. Be the first to review!</p>
            ) : (
              location.reviews.map((review) => (
                <div key={review.id} className="review-card">
                  <div className="review-header">
                    {review.author.avatarUrl ? (
                      <img src={review.author.avatarUrl} alt="" className="review-avatar" />
                    ) : (
                      <div className="review-avatar" />
                    )}
                    <span className="review-author">
                      {review.author.username || 'Anonymous'}
                    </span>
                    <span className="review-rating">
                      {'⭐'.repeat(review.rating)}
                    </span>
                  </div>
                  {review.title && <strong>{review.title}</strong>}
                  <p className="review-content">{review.content}</p>
                  <div className="review-date">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
