"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Building2, Home } from "lucide-react";

interface Neighborhood {
  id: string;
  name: string;
  locationCount?: number;
  city: {
    id: string;
    name: string;
    country: string;
  };
  _count?: {
    locations: number;
  };
}

export default function NeighborhoodsPage() {
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNeighborhoods() {
      try {
        const res = await fetch("/api/neighborhoods");
        if (res.ok) {
          setNeighborhoods(await res.json());
        }
      } catch (error) {
        console.error("Failed to fetch neighborhoods:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchNeighborhoods();
  }, []);

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

  const byCity = neighborhoods.reduce((acc, n) => {
    const cityKey = n.city.id;
    if (!acc[cityKey]) {
      acc[cityKey] = {
        city: n.city,
        neighborhoods: [],
      };
    }
    acc[cityKey].neighborhoods.push(n);
    return acc;
  }, {} as Record<string, { city: Neighborhood["city"]; neighborhoods: Neighborhood[] }>);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded flex items-center justify-center"
            style={{ background: 'rgba(95, 191, 138, 0.2)', border: '2px solid var(--rpg-teal)' }}
          >
            <Home className="w-5 h-5" style={{ color: 'var(--rpg-teal)' }} />
          </div>
          <div>
            <h1 className="text-lg" style={{ color: 'var(--rpg-teal)', textShadow: '0 0 10px var(--rpg-teal-glow)' }}>
              Neighborhoods
            </h1>
            <p className="text-[0.55rem]" style={{ color: 'var(--rpg-muted)' }}>
              {neighborhoods.length} neighborhoods
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {Object.values(byCity).map(({ city, neighborhoods: cityNeighborhoods }) => (
          <div key={city.id}>
            <Link
              href={`/cities/${city.id}`}
              className="flex items-center gap-2 text-[0.7rem] mb-4 transition-colors"
              style={{ color: 'var(--rpg-gold)', textShadow: '0 0 8px var(--rpg-gold-glow)' }}
            >
              <Building2 className="w-4 h-4" />
              {city.name}, {city.country}
            </Link>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cityNeighborhoods.map((neighborhood) => (
                <Link
                  key={neighborhood.id}
                  href={`/neighborhoods/${neighborhood.id}`}
                  className="rounded-lg p-4 transition-all"
                  style={{
                    background: 'var(--rpg-card)',
                    border: '2px solid var(--rpg-border)',
                    boxShadow: '0 4px 0 rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-[0.6rem]" style={{ color: 'var(--rpg-text)' }}>
                        {neighborhood.name}
                      </h3>
                      <p className="text-[0.5rem] mt-1 flex items-center gap-1" style={{ color: 'var(--rpg-muted)' }}>
                        <MapPin className="w-3 h-3" style={{ color: 'var(--rpg-teal)' }} />
                        {neighborhood.locationCount || neighborhood._count?.locations || 0} locations
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {neighborhoods.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[0.55rem]" style={{ color: 'var(--rpg-muted)' }}>
              No neighborhoods found
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
