"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Star, CheckCircle, Flame } from "lucide-react";

interface Location {
  id: string;
  name: string;
  type: string;
  avgRating?: number;
  visited: boolean;
  hotlist: boolean;
}

interface Neighborhood {
  id: string;
  name: string;
  description?: string;
  city: {
    id: string;
    name: string;
    country: string;
  };
  locations: Location[];
}

const typeColors: Record<string, string> = {
  RESTAURANT: "bg-orange-500/10 text-orange-400",
  BAR: "bg-purple-500/10 text-purple-400",
  CAFE: "bg-amber-500/10 text-amber-400",
  ATTRACTION: "bg-cyan-500/10 text-cyan-400",
  HOTEL: "bg-blue-500/10 text-blue-400",
  SHOP: "bg-pink-500/10 text-pink-400",
  NATURE: "bg-green-500/10 text-green-400",
  MUSEUM: "bg-indigo-500/10 text-indigo-400",
  BEACH: "bg-teal-500/10 text-teal-400",
  NIGHTLIFE: "bg-fuchsia-500/10 text-fuchsia-400",
  OTHER: "bg-gray-500/10 text-gray-400",
};

export default function NeighborhoodDetailPage() {
  const params = useParams();
  const [neighborhood, setNeighborhood] = useState<Neighborhood | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/neighborhoods/${params.neighborhoodId}`);
        if (res.ok) {
          setNeighborhood(await res.json());
        }
      } catch (error) {
        console.error("Failed to fetch neighborhood:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.neighborhoodId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400" />
      </div>
    );
  }

  if (!neighborhood) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-400">Neighborhood not found</p>
      </div>
    );
  }

  // Group locations by type
  const byType = neighborhood.locations.reduce((acc, loc) => {
    if (!acc[loc.type]) {
      acc[loc.type] = [];
    }
    acc[loc.type].push(loc);
    return acc;
  }, {} as Record<string, Location[]>);

  const typeOrder = ["RESTAURANT", "CAFE", "BAR", "MUSEUM", "SHOP", "NATURE", "ATTRACTION", "NIGHTLIFE", "OTHER"];
  const sortedTypes = Object.keys(byType).sort(
    (a, b) => typeOrder.indexOf(a) - typeOrder.indexOf(b)
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/cities" className="hover:text-white">
          Cities
        </Link>
        <span>/</span>
        <Link href={`/cities/${neighborhood.city.id}`} className="hover:text-white">
          {neighborhood.city.name}
        </Link>
        <span>/</span>
        <span className="text-white">{neighborhood.name}</span>
      </div>

      {/* Header */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">{neighborhood.name}</h1>
        <Link
          href={`/cities/${neighborhood.city.id}`}
          className="text-gray-400 hover:text-cyan-400 flex items-center gap-1"
        >
          <MapPin className="w-4 h-4" />
          {neighborhood.city.name}, {neighborhood.city.country}
        </Link>

        {neighborhood.description && (
          <p className="text-gray-300 mt-4">{neighborhood.description}</p>
        )}

        <div className="mt-4 pt-4 border-t border-gray-800">
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-gray-500">Locations</span>
              <p className="text-xl font-semibold text-white">{neighborhood.locations.length}</p>
            </div>
            <div>
              <span className="text-gray-500">Visited</span>
              <p className="text-xl font-semibold text-white">
                {neighborhood.locations.filter(l => l.visited).length}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Hotlist</span>
              <p className="text-xl font-semibold text-white">
                {neighborhood.locations.filter(l => l.hotlist).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Locations by Type */}
      <div className="space-y-6">
        {sortedTypes.map((type) => (
          <div key={type}>
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs ${typeColors[type]}`}>
                {type.charAt(0) + type.slice(1).toLowerCase()}
              </span>
              <span className="text-gray-500 text-sm font-normal">
                ({byType[type].length})
              </span>
            </h2>

            <div className="space-y-2">
              {byType[type].map((location) => (
                <Link
                  key={location.id}
                  href={`/locations/${location.id}`}
                  className="block bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-white">{location.name}</h3>
                      {location.visited && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                      {location.hotlist && (
                        <Flame className="w-4 h-4 text-orange-500" />
                      )}
                    </div>
                    {location.avgRating && (
                      <div className="flex items-center gap-1 text-yellow-400">
                        <Star className="w-4 h-4 fill-current" />
                        <span>{location.avgRating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {neighborhood.locations.length === 0 && (
          <p className="text-gray-500 text-center py-8">
            No locations in this neighborhood yet
          </p>
        )}
      </div>
    </div>
  );
}
