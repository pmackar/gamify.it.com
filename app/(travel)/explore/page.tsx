'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useMapStore } from '@/stores/map-store';
import { LocationListItem } from '@/types';
import { toggleHotlist, markAsVisited } from '@/app/actions/location-actions';

// Dynamic import for MapView to avoid SSR issues with Mapbox
const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="map-loading">
      <span>Loading map...</span>
    </div>
  ),
});

export default function ExplorePage() {
  const [locations, setLocations] = useState<LocationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { selectedLocationId, selectLocation, isSidebarOpen, toggleSidebar, bounds } = useMapStore();

  // Fetch locations
  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      // If we have map bounds, use nearby search
      if (bounds) {
        const centerLat = (bounds[0][1] + bounds[1][1]) / 2;
        const centerLng = (bounds[0][0] + bounds[1][0]) / 2;
        // Calculate radius from bounds
        const latDiff = Math.abs(bounds[1][1] - bounds[0][1]);
        const radiusKm = (latDiff * 111) / 2; // Approximate

        const response = await fetch(
          `/api/locations/nearby?lat=${centerLat}&lng=${centerLng}&radius=${Math.min(radiusKm, 50)}`
        );
        const data = await response.json();
        setLocations(data.data || []);
      } else {
        // Default: fetch all locations
        const response = await fetch('/api/locations?limit=100');
        const data = await response.json();
        setLocations(data.data || []);
      }
    } catch (err) {
      setError('Failed to load locations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [bounds]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const selectedLocation = locations.find((l) => l.id === selectedLocationId);

  const handleHotlistToggle = async (locationId: string) => {
    try {
      await toggleHotlist(locationId);
      // Optimistically update UI
      setLocations((prev) =>
        prev.map((loc) =>
          loc.id === locationId
            ? {
                ...loc,
                userSpecific: {
                  ...loc.userSpecific,
                  hotlist: !loc.userSpecific?.hotlist,
                  visited: loc.userSpecific?.visited ?? false,
                  rating: loc.userSpecific?.rating ?? null,
                },
              }
            : loc
        )
      );
    } catch (err) {
      console.error('Failed to toggle hotlist:', err);
    }
  };

  const handleVisitedToggle = async (locationId: string) => {
    try {
      await markAsVisited(locationId);
      setLocations((prev) =>
        prev.map((loc) =>
          loc.id === locationId
            ? {
                ...loc,
                userSpecific: {
                  ...loc.userSpecific,
                  visited: true,
                  hotlist: loc.userSpecific?.hotlist ?? false,
                  rating: loc.userSpecific?.rating ?? null,
                },
              }
            : loc
        )
      );
    } catch (err) {
      console.error('Failed to mark as visited:', err);
    }
  };

  return (
    <>
      <style jsx>{`
        .explore-container {
          display: flex;
          height: calc(100vh - 60px);
          background: #0a0a0a;
        }

        .explore-sidebar {
          width: 380px;
          background: #1a1a1a;
          border-right: 2px solid #2a2a2a;
          display: flex;
          flex-direction: column;
          transition: margin-left 0.3s ease;
        }

        .explore-sidebar.closed {
          margin-left: -380px;
        }

        .sidebar-header {
          padding: 1rem;
          border-bottom: 2px solid #2a2a2a;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sidebar-title {
          font-size: 0.6rem;
          color: #FFD700;
          text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
        }

        .sidebar-toggle {
          background: #2a2a2a;
          border: 2px solid #3a3a3a;
          color: #fff;
          padding: 0.5rem;
          cursor: pointer;
          font-size: 0.8rem;
          border-radius: 4px;
        }

        .sidebar-content {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
        }

        .location-card {
          background: #2a2a2a;
          border: 2px solid #3a3a3a;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .location-card:hover,
        .location-card.selected {
          border-color: #FFD700;
          box-shadow: 0 0 12px rgba(255, 215, 0, 0.3);
        }

        .location-card.visited {
          border-color: #00ff00;
        }

        .location-name {
          font-size: 0.55rem;
          color: #fff;
          margin-bottom: 0.5rem;
        }

        .location-meta {
          font-size: 0.4rem;
          color: #888;
          margin-bottom: 0.75rem;
        }

        .location-stats {
          display: flex;
          gap: 1rem;
          font-size: 0.4rem;
          color: #888;
          margin-bottom: 0.75rem;
        }

        .location-stat {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .location-actions {
          display: flex;
          gap: 0.5rem;
        }

        .action-btn {
          flex: 1;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.35rem;
          padding: 0.5rem;
          border: 2px solid #3a3a3a;
          border-radius: 4px;
          background: #1a1a1a;
          color: #888;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: #2a2a2a;
          color: #fff;
        }

        .action-btn.active {
          border-color: #FFD700;
          color: #FFD700;
        }

        .action-btn.visited {
          border-color: #00ff00;
          color: #00ff00;
        }

        .explore-map {
          flex: 1;
          position: relative;
        }

        .map-loading {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1a1a1a;
          color: #888;
          font-size: 0.5rem;
        }

        .map-toggle {
          position: absolute;
          top: 1rem;
          left: 1rem;
          z-index: 10;
          background: #1a1a1a;
          border: 2px solid #3a3a3a;
          color: #fff;
          padding: 0.5rem 0.75rem;
          cursor: pointer;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.4rem;
          border-radius: 4px;
        }

        .map-toggle:hover {
          background: #2a2a2a;
          border-color: #FFD700;
        }

        .empty-state {
          text-align: center;
          padding: 2rem;
          color: #888;
          font-size: 0.45rem;
        }

        .rating-stars {
          color: #FFD700;
        }

        @media (max-width: 768px) {
          .explore-sidebar {
            position: fixed;
            top: 60px;
            left: 0;
            bottom: 70px;
            width: 100%;
            z-index: 50;
          }

          .explore-sidebar.closed {
            transform: translateX(-100%);
            margin-left: 0;
          }
        }
      `}</style>

      <div className="explore-container">
        <aside className={`explore-sidebar ${isSidebarOpen ? '' : 'closed'}`}>
          <div className="sidebar-header">
            <h2 className="sidebar-title">Nearby Locations</h2>
            <button className="sidebar-toggle" onClick={toggleSidebar}>
              ✕
            </button>
          </div>

          <div className="sidebar-content">
            {loading ? (
              <div className="empty-state">Loading...</div>
            ) : error ? (
              <div className="empty-state">{error}</div>
            ) : locations.length === 0 ? (
              <div className="empty-state">No locations found in this area</div>
            ) : (
              locations.map((location) => (
                <div
                  key={location.id}
                  className={`location-card ${selectedLocationId === location.id ? 'selected' : ''} ${location.userSpecific?.visited ? 'visited' : ''}`}
                  onClick={() => selectLocation(location.id)}
                >
                  <h3 className="location-name">{location.name}</h3>
                  <p className="location-meta">
                    {location.city}
                    {location.state ? `, ${location.state}` : ''} · {location.category.toLowerCase()}
                  </p>

                  <div className="location-stats">
                    <span className="location-stat">
                      👁️ {location.totalVisits}
                    </span>
                    {location.averageRating && (
                      <span className="location-stat rating-stars">
                        ⭐ {location.averageRating.toFixed(1)}
                      </span>
                    )}
                    {location.distanceKm !== undefined && (
                      <span className="location-stat">
                        📍 {location.distanceKm.toFixed(1)}km
                      </span>
                    )}
                  </div>

                  <div className="location-actions">
                    <button
                      className={`action-btn ${location.userSpecific?.hotlist ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleHotlistToggle(location.id);
                      }}
                    >
                      {location.userSpecific?.hotlist ? '❤️ Saved' : '🤍 Save'}
                    </button>
                    <button
                      className={`action-btn ${location.userSpecific?.visited ? 'visited' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVisitedToggle(location.id);
                      }}
                    >
                      {location.userSpecific?.visited ? '✓ Visited' : '📍 Check In'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        <div className="explore-map">
          {!isSidebarOpen && (
            <button className="map-toggle" onClick={toggleSidebar}>
              ☰ List
            </button>
          )}
          <MapView
            locations={locations}
            onLocationClick={(loc) => selectLocation(loc.id)}
          />
        </div>
      </div>
    </>
  );
}
