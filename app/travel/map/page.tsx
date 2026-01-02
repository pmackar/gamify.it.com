"use client";

import { useEffect, useState } from "react";
import MapView from "@/components/map/MapView";
import LocationDetailModal from "@/components/map/LocationDetailModal";
import { Filter, X } from "lucide-react";

interface Location {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  avgRating: number | null;
  city: {
    name: string;
    country: string;
  };
}

const LOCATION_TYPES = [
  "RESTAURANT",
  "BAR",
  "CAFE",
  "ATTRACTION",
  "HOTEL",
  "SHOP",
  "NATURE",
  "MUSEUM",
  "BEACH",
  "NIGHTLIFE",
  "OTHER",
];

export default function MapPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLocations() {
      try {
        const res = await fetch("/api/locations?limit=500");
        if (res.ok) {
          const json = await res.json();
          // Handle both { data: [...] } and direct array formats
          const data = json.data || json;
          if (Array.isArray(data)) {
            setLocations(data);
            setFilteredLocations(data);
          }
        }
      } catch (error) {
        console.error("Failed to fetch locations:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchLocations();
  }, []);

  useEffect(() => {
    const handleOpenDetail = (e: CustomEvent<string>) => {
      setSelectedLocationId(e.detail);
    };

    window.addEventListener("openLocationDetail", handleOpenDetail as EventListener);
    return () => {
      window.removeEventListener("openLocationDetail", handleOpenDetail as EventListener);
    };
  }, []);

  useEffect(() => {
    const withCoords = locations.filter(
      (loc) => loc.latitude !== 0 || loc.longitude !== 0
    );

    if (selectedTypes.length === 0) {
      setFilteredLocations(withCoords);
    } else {
      setFilteredLocations(
        withCoords.filter((loc) => selectedTypes.includes(loc.type))
      );
    }
  }, [selectedTypes, locations]);

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSelectedTypes([]);
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-56px)] flex items-center justify-center">
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
    <div className="h-[calc(100vh-56px)] relative">
      <MapView
        locations={filteredLocations}
        className="h-full"
      />

      <LocationDetailModal
        locationId={selectedLocationId}
        onClose={() => setSelectedLocationId(null)}
      />

      {/* Filter Button */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="absolute top-4 right-4 px-3 py-2 rounded flex items-center gap-2 text-[0.55rem] transition-colors"
        style={{
          background: showFilters || selectedTypes.length > 0 ? 'var(--rpg-teal)' : 'var(--rpg-card)',
          color: showFilters || selectedTypes.length > 0 ? 'var(--rpg-bg-dark)' : 'var(--rpg-text)',
          border: '2px solid var(--rpg-border)',
          boxShadow: '0 4px 0 rgba(0, 0, 0, 0.3)',
        }}
      >
        <Filter className="w-3 h-3" />
        Filter
        {selectedTypes.length > 0 && (
          <span
            className="px-2 py-0.5 rounded text-[0.45rem]"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            {selectedTypes.length}
          </span>
        )}
      </button>

      {/* Filter Panel */}
      {showFilters && (
        <div
          className="absolute top-16 right-4 rounded-lg p-4 w-56 max-h-[60vh] overflow-y-auto"
          style={{
            background: 'var(--rpg-card)',
            border: '2px solid var(--rpg-border)',
            boxShadow: '0 4px 0 rgba(0, 0, 0, 0.3)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[0.6rem]" style={{ color: 'var(--rpg-teal)' }}>Filter by Type</h3>
            {selectedTypes.length > 0 && (
              <button
                onClick={clearFilters}
                className="text-[0.45rem] flex items-center gap-1"
                style={{ color: 'var(--rpg-muted)' }}
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
          <div className="space-y-2">
            {LOCATION_TYPES.map((type) => (
              <label
                key={type}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(type)}
                  onChange={() => toggleType(type)}
                  className="rounded"
                  style={{
                    background: 'var(--rpg-bg-dark)',
                    borderColor: 'var(--rpg-border)',
                    accentColor: 'var(--rpg-teal)',
                  }}
                />
                <span className="text-[0.5rem] capitalize" style={{ color: 'var(--rpg-muted)' }}>
                  {type.toLowerCase()}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Stats Overlay */}
      <div
        className="absolute bottom-4 right-4 rounded-lg px-4 py-2 text-[0.5rem]"
        style={{
          background: 'var(--rpg-card)',
          border: '2px solid var(--rpg-border)',
          boxShadow: '0 4px 0 rgba(0, 0, 0, 0.3)',
        }}
      >
        <span style={{ color: 'var(--rpg-muted)' }}>Showing </span>
        <span style={{ color: 'var(--rpg-gold)' }}>{filteredLocations.length}</span>
        <span style={{ color: 'var(--rpg-muted)' }}> locations on map</span>
        {locations.length - filteredLocations.length > 0 && (
          <span className="block text-[0.45rem] mt-1" style={{ color: 'var(--rpg-muted)' }}>
            ({locations.length - filteredLocations.length} missing coordinates)
          </span>
        )}
      </div>
    </div>
  );
}
