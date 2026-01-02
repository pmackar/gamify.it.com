"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, MapPin, Calendar, ChevronRight, Plus, LayoutGrid, List } from "lucide-react";

interface City {
  id: string;
  name: string;
  country: string;
  region: string | null;
  visitCount: number;
  locationCount: number;
  firstVisited: string | null;
  lastVisited: string | null;
  _count?: {
    locations: number;
  };
}

export default function CitiesPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'sheet' | 'list'>('sheet');

  useEffect(() => {
    async function fetchCities() {
      try {
        const res = await fetch("/api/cities");
        if (res.ok) {
          const data = await res.json();
          setCities(data);
        }
      } catch (error) {
        console.error("Failed to fetch cities:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchCities();
  }, []);

  const citiesByCountry = cities.reduce((acc, city) => {
    if (!acc[city.country]) {
      acc[city.country] = [];
    }
    acc[city.country].push(city);
    return acc;
  }, {} as Record<string, City[]>);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="w-12 h-12 rounded"
          style={{
            border: '4px solid var(--rpg-border)',
            borderTop: '4px solid var(--rpg-teal)',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-lg mb-2" style={{ color: 'var(--rpg-teal)', textShadow: '0 0 10px var(--rpg-teal-glow)' }}>
            Cities
          </h1>
          <p className="text-[0.55rem]" style={{ color: 'var(--rpg-muted)' }}>
            {cities.length} cities across {Object.keys(citiesByCountry).length} countries
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '2px solid var(--rpg-border)' }}>
            <button
              onClick={() => setViewMode('sheet')}
              className="p-2 transition-colors"
              style={{
                background: viewMode === 'sheet' ? 'var(--rpg-teal)' : 'var(--rpg-card)',
                color: viewMode === 'sheet' ? 'var(--rpg-bg-dark)' : 'var(--rpg-muted)',
              }}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="p-2 transition-colors"
              style={{
                background: viewMode === 'list' ? 'var(--rpg-teal)' : 'var(--rpg-card)',
                color: viewMode === 'list' ? 'var(--rpg-bg-dark)' : 'var(--rpg-muted)',
              }}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <Link href="/travel/locations/new" className="rpg-btn flex items-center gap-2">
            <Plus className="w-3 h-3" />
            Add Location
          </Link>
        </div>
      </div>

      {cities.length === 0 ? (
        <div className="text-center py-16">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-lg mb-4"
            style={{ background: 'var(--rpg-card)', border: '2px solid var(--rpg-border)' }}
          >
            <Building2 className="w-8 h-8" style={{ color: 'var(--rpg-muted)' }} />
          </div>
          <h2 className="text-sm mb-2" style={{ color: 'var(--rpg-text)' }}>No cities yet</h2>
          <p className="text-[0.5rem] mb-6" style={{ color: 'var(--rpg-muted)' }}>
            Add places you've visited or want to explore
          </p>
          <Link href="/travel/locations/new" className="rpg-btn">
            <Plus className="w-3 h-3 inline mr-2" />
            Add Your First Location
          </Link>
        </div>
      ) : viewMode === 'sheet' ? (
        /* Sheet/Grid View */
        <div className="space-y-8">
          {Object.entries(citiesByCountry)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([country, countryCities]) => (
              <div key={country}>
                <h2
                  className="text-[0.7rem] mb-4 flex items-center gap-2"
                  style={{ color: 'var(--rpg-gold)', textShadow: '0 0 8px var(--rpg-gold-glow)' }}
                >
                  <span className="text-xl">{getCountryFlag(country)}</span>
                  {country}
                  <span className="text-[0.5rem]" style={{ color: 'var(--rpg-muted)' }}>
                    ({countryCities.length} {countryCities.length === 1 ? "city" : "cities"})
                  </span>
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {countryCities.map((city) => (
                    <Link
                      key={city.id}
                      href={`/travel/cities/${city.id}`}
                      className="group rounded-lg p-5 transition-all"
                      style={{
                        background: 'var(--rpg-card)',
                        border: '2px solid var(--rpg-border)',
                        boxShadow: '0 4px 0 rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-[0.65rem] transition-colors" style={{ color: 'var(--rpg-text)' }}>
                            {city.name}
                          </h3>
                          {city.region && (
                            <p className="text-[0.5rem]" style={{ color: 'var(--rpg-muted)' }}>{city.region}</p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4" style={{ color: 'var(--rpg-muted)' }} />
                      </div>
                      <div className="flex items-center gap-4 text-[0.5rem]" style={{ color: 'var(--rpg-muted)' }}>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" style={{ color: 'var(--rpg-teal)' }} />
                          {city.locationCount || city._count?.locations || 0} locations
                        </span>
                        {city.lastVisited && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" style={{ color: 'var(--rpg-gold)' }} />
                            {new Date(city.lastVisited).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
        </div>
      ) : (
        /* List View */
        <div className="space-y-6">
          {Object.entries(citiesByCountry)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([country, countryCities]) => (
              <div key={country}>
                <h2
                  className="text-[0.7rem] mb-3 flex items-center gap-2"
                  style={{ color: 'var(--rpg-gold)', textShadow: '0 0 8px var(--rpg-gold-glow)' }}
                >
                  <span className="text-xl">{getCountryFlag(country)}</span>
                  {country}
                  <span className="text-[0.5rem]" style={{ color: 'var(--rpg-muted)' }}>
                    ({countryCities.length} {countryCities.length === 1 ? "city" : "cities"})
                  </span>
                </h2>
                <div className="rounded-lg overflow-hidden" style={{ border: '2px solid var(--rpg-border)' }}>
                  {countryCities.map((city, index) => (
                    <Link
                      key={city.id}
                      href={`/travel/cities/${city.id}`}
                      className="flex items-center gap-4 p-4 transition-all hover:bg-opacity-50"
                      style={{
                        background: index % 2 === 0 ? 'var(--rpg-card)' : 'var(--rpg-bg-dark)',
                        borderBottom: index < countryCities.length - 1 ? '1px solid var(--rpg-border)' : 'none',
                      }}
                    >
                      {/* City Name */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[0.6rem] truncate" style={{ color: 'var(--rpg-text)' }}>
                          {city.name}
                        </h3>
                        {city.region && (
                          <p className="text-[0.5rem] truncate" style={{ color: 'var(--rpg-muted)' }}>{city.region}</p>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <span className="flex items-center gap-1 text-[0.5rem]" style={{ color: 'var(--rpg-teal)' }}>
                          <MapPin className="w-3 h-3" />
                          {city.locationCount || city._count?.locations || 0}
                        </span>
                        {city.lastVisited && (
                          <span className="flex items-center gap-1 text-[0.45rem]" style={{ color: 'var(--rpg-muted)' }}>
                            <Calendar className="w-3 h-3" />
                            {new Date(city.lastVisited).toLocaleDateString()}
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4" style={{ color: 'var(--rpg-muted)' }} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function getCountryFlag(country: string): string {
  const flagMap: Record<string, string> = {
    "United States": "🇺🇸",
    "United Kingdom": "🇬🇧",
    "Canada": "🇨🇦",
    "France": "🇫🇷",
    "Germany": "🇩🇪",
    "Italy": "🇮🇹",
    "Spain": "🇪🇸",
    "Japan": "🇯🇵",
    "Australia": "🇦🇺",
    "Brazil": "🇧🇷",
    "Mexico": "🇲🇽",
    "Netherlands": "🇳🇱",
    "Portugal": "🇵🇹",
    "Thailand": "🇹🇭",
    "Greece": "🇬🇷",
    "Switzerland": "🇨🇭",
    "Austria": "🇦🇹",
    "Belgium": "🇧🇪",
    "Sweden": "🇸🇪",
    "Norway": "🇳🇴",
    "Denmark": "🇩🇰",
    "Finland": "🇫🇮",
    "Ireland": "🇮🇪",
    "Czech Republic": "🇨🇿",
    "Poland": "🇵🇱",
    "Hungary": "🇭🇺",
    "Croatia": "🇭🇷",
    "New Zealand": "🇳🇿",
    "Singapore": "🇸🇬",
    "South Korea": "🇰🇷",
    "China": "🇨🇳",
    "India": "🇮🇳",
    "Vietnam": "🇻🇳",
    "Indonesia": "🇮🇩",
    "Philippines": "🇵🇭",
    "Malaysia": "🇲🇾",
    "UAE": "🇦🇪",
    "Turkey": "🇹🇷",
    "Egypt": "🇪🇬",
    "Morocco": "🇲🇦",
    "South Africa": "🇿🇦",
    "Argentina": "🇦🇷",
    "Chile": "🇨🇱",
    "Colombia": "🇨🇴",
    "Peru": "🇵🇪",
  };
  return flagMap[country] || "🌍";
}
