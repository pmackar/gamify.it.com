'use client';

import { useEffect, useState } from 'react';
import { LocationCard } from '@/components/location/LocationCard';
import { LocationListItem, LocationCategory } from '@/types';

const CATEGORIES = [
  'ALL',
  'RESTAURANT',
  'CAFE',
  'BAR',
  'PARK',
  'MUSEUM',
  'LANDMARK',
  'HISTORIC',
  'NATURE',
  'HIDDEN_GEM',
] as const;

export default function LocationsPage() {
  const [locations, setLocations] = useState<LocationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [city, setCity] = useState('');

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('query', searchQuery);
      if (selectedCategory !== 'ALL') params.set('category', selectedCategory);
      if (city) params.set('city', city);
      params.set('limit', '50');

      const res = await fetch(`/api/locations?${params}`);
      const data = await res.json();
      setLocations(data.data || []);
    } catch (err) {
      console.error('Failed to fetch locations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [selectedCategory, city]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLocations();
  };

  return (
    <>
      <style jsx>{`
        .locations-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .page-title {
          font-size: 0.8rem;
          color: #FFD700;
          margin-bottom: 0.5rem;
        }

        .page-subtitle {
          font-size: 0.45rem;
          color: #888;
        }

        .filters-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 2rem;
          padding: 1rem;
          background: #1a1a1a;
          border: 2px solid #2a2a2a;
          border-radius: 8px;
        }

        .search-form {
          display: flex;
          gap: 0.5rem;
          flex: 1;
          min-width: 250px;
        }

        .search-input {
          flex: 1;
          padding: 0.5rem 0.75rem;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.4rem;
          background: #0a0a0a;
          border: 2px solid #3a3a3a;
          border-radius: 4px;
          color: #fff;
        }

        .search-input:focus {
          outline: none;
          border-color: #FFD700;
        }

        .search-btn {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.4rem;
          padding: 0.5rem 1rem;
          background: #FFD700;
          border: 2px solid #CC8800;
          border-radius: 4px;
          color: #1a1a1a;
          cursor: pointer;
        }

        .city-input {
          width: 150px;
          padding: 0.5rem 0.75rem;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.4rem;
          background: #0a0a0a;
          border: 2px solid #3a3a3a;
          border-radius: 4px;
          color: #fff;
        }

        .category-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .category-btn {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.35rem;
          padding: 0.4rem 0.6rem;
          background: #0a0a0a;
          border: 2px solid #3a3a3a;
          border-radius: 4px;
          color: #888;
          cursor: pointer;
          transition: all 0.2s;
        }

        .category-btn:hover {
          border-color: #4a4a4a;
          color: #fff;
        }

        .category-btn.active {
          border-color: #FFD700;
          color: #FFD700;
        }

        .results-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .results-count {
          font-size: 0.45rem;
          color: #888;
        }

        .locations-grid {
          display: grid;
          gap: 1rem;
        }

        @media (min-width: 768px) {
          .locations-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .locations-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .loading-state, .empty-state {
          text-align: center;
          padding: 3rem;
          color: #888;
          font-size: 0.5rem;
        }
      `}</style>

      <div className="locations-container">
        <div className="page-header">
          <h1 className="page-title">Browse Locations</h1>
          <p className="page-subtitle">Discover places to explore</p>
        </div>

        <div className="filters-bar">
          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="text"
              className="search-input"
              placeholder="Search locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="search-btn">Search</button>
          </form>

          <input
            type="text"
            className="city-input"
            placeholder="City..."
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>

        <div className="category-filters">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat.toLowerCase().replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="results-header">
          <span className="results-count">
            {loading ? 'Loading...' : `${locations.length} locations found`}
          </span>
        </div>

        {loading ? (
          <div className="loading-state">Loading locations...</div>
        ) : locations.length === 0 ? (
          <div className="empty-state">No locations found. Try a different search.</div>
        ) : (
          <div className="locations-grid">
            {locations.map((location) => (
              <LocationCard
                key={location.id}
                location={location}
                onUpdate={fetchLocations}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
