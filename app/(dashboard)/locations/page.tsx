"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Star, Filter, Plus, ChevronRight, X } from "lucide-react";

interface Location {
  id: string;
  name: string;
  type: string;
  address: string | null;
  avgRating: number | null;
  ratingCount: number;
  city: {
    name: string;
    country: string;
  };
  _count: {
    visits: number;
    photos: number;
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

const TYPE_COLORS: Record<string, string> = {
  RESTAURANT: "bg-red-500/10 text-red-400",
  BAR: "bg-purple-500/10 text-purple-400",
  CAFE: "bg-orange-500/10 text-orange-400",
  ATTRACTION: "bg-cyan-500/10 text-cyan-400",
  HOTEL: "bg-blue-500/10 text-blue-400",
  SHOP: "bg-violet-500/10 text-violet-400",
  NATURE: "bg-green-500/10 text-green-400",
  MUSEUM: "bg-amber-500/10 text-amber-400",
  BEACH: "bg-teal-500/10 text-teal-400",
  NIGHTLIFE: "bg-rose-500/10 text-rose-400",
  OTHER: "bg-gray-500/10 text-gray-400",
};

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

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

  useEffect(() => {
    let filtered = locations;

    // Filter by type
    if (selectedTypes.length > 0) {
      filtered = filtered.filter((loc) => selectedTypes.includes(loc.type));
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (loc) =>
          loc.name.toLowerCase().includes(query) ||
          loc.city.name.toLowerCase().includes(query) ||
          loc.city.country.toLowerCase().includes(query)
      );
    }

    setFilteredLocations(filtered);
  }, [selectedTypes, searchQuery, locations]);

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Locations</h1>
          <p className="text-gray-400">{locations.length} places you've been</p>
        </div>
        <Link
          href="/locations/new"
          className="flex items-center justify-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Location
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search locations, cities, or countries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            showFilters || selectedTypes.length > 0
              ? "bg-cyan-500 text-white"
              : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
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
      </div>

      {/* Filter Pills */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 mb-6 p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
          {LOCATION_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors capitalize ${
                selectedTypes.includes(type)
                  ? "bg-cyan-500 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {type.toLowerCase()}
            </button>
          ))}
          {selectedTypes.length > 0 && (
            <button
              onClick={() => setSelectedTypes([])}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 hover:text-white"
            >
              <X className="w-3 h-3" />
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {filteredLocations.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 mb-4">
            <MapPin className="w-8 h-8 text-gray-600" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            {locations.length === 0 ? "No locations yet" : "No matching locations"}
          </h2>
          <p className="text-gray-400 mb-6">
            {locations.length === 0
              ? "Start tracking your travels by adding your first location"
              : "Try adjusting your filters or search query"}
          </p>
          {locations.length === 0 && (
            <Link
              href="/locations/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Your First Location
            </Link>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLocations.map((location) => (
            <Link
              key={location.id}
              href={`/locations/${location.id}`}
              className="group bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-cyan-500/50 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors truncate">
                    {location.name}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">
                    {location.city.name}, {location.city.country}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
              </div>

              <div className="flex items-center gap-3 mb-3">
                <span
                  className={`px-2 py-1 rounded-md text-xs font-medium capitalize ${
                    TYPE_COLORS[location.type] || TYPE_COLORS.OTHER
                  }`}
                >
                  {location.type.toLowerCase()}
                </span>
                {location.avgRating && (
                  <span className="flex items-center gap-1 text-sm text-yellow-400">
                    <Star className="w-4 h-4 fill-current" />
                    {location.avgRating.toFixed(1)}
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-500">
                {location._count.visits} visit{location._count.visits !== 1 ? "s" : ""}
                {location._count.photos > 0 &&
                  ` · ${location._count.photos} photo${location._count.photos !== 1 ? "s" : ""}`}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
