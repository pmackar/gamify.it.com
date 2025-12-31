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
        const res = await fetch("/api/locations");
        if (res.ok) {
          const data = await res.json();
          setLocations(data);
          setFilteredLocations(data);
        }
      } catch (error) {
        console.error("Failed to fetch locations:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchLocations();
  }, []);

  // Listen for custom event from map popup
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
    // Filter out locations at 0,0 (no coordinates)
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
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] relative">
      <MapView
        locations={filteredLocations}
        className="h-full"
      />

      {/* Location Detail Modal */}
      <LocationDetailModal
        locationId={selectedLocationId}
        onClose={() => setSelectedLocationId(null)}
      />

      {/* Filter Button */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={`absolute top-4 right-4 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
          showFilters || selectedTypes.length > 0
            ? "bg-cyan-500 text-white"
            : "bg-gray-900/90 text-gray-300 hover:bg-gray-800"
        }`}
      >
        <Filter className="w-4 h-4" />
        Filter
        {selectedTypes.length > 0 && (
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
            {selectedTypes.length}
          </span>
        )}
      </button>

      {/* Filter Panel */}
      {showFilters && (
        <div className="absolute top-16 right-4 bg-gray-900/95 backdrop-blur-sm border border-gray-800 rounded-xl p-4 w-64 max-h-[60vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Filter by Type</h3>
            {selectedTypes.length > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
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
                  className="rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-sm text-gray-300 group-hover:text-white capitalize">
                  {type.toLowerCase()}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Stats Overlay */}
      <div className="absolute bottom-4 right-4 bg-gray-900/90 backdrop-blur-sm rounded-lg px-4 py-2 text-sm">
        <span className="text-gray-400">Showing </span>
        <span className="text-white font-medium">{filteredLocations.length}</span>
        <span className="text-gray-400"> locations on map</span>
        {locations.length - filteredLocations.length > 0 && (
          <span className="text-gray-500 block text-xs mt-1">
            ({locations.length - filteredLocations.length} missing coordinates)
          </span>
        )}
      </div>
    </div>
  );
}
