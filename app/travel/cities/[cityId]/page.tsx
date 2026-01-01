"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Star, Building2 } from "lucide-react";

interface Neighborhood {
  id: string;
  name: string;
  _count: {
    locations: number;
  };
}

interface City {
  id: string;
  name: string;
  country: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  firstVisited?: string;
  lastVisited?: string;
  visitCount: number;
  locationCount: number;
  notes?: string;
}

interface Location {
  id: string;
  name: string;
  type: string;
  avgRating?: number;
  _count: { visits: number };
}

export default function CityDetailPage() {
  const params = useParams();
  const [city, setCity] = useState<City | null>(null);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [locationsWithoutNeighborhood, setLocationsWithoutNeighborhood] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [cityRes, neighborhoodsRes, locationsRes] = await Promise.all([
          fetch(`/api/cities/${params.cityId}`),
          fetch(`/api/neighborhoods?cityId=${params.cityId}`),
          fetch(`/api/locations?cityId=${params.cityId}&noNeighborhood=true`),
        ]);

        if (cityRes.ok) {
          setCity(await cityRes.json());
        }
        if (neighborhoodsRes.ok) {
          setNeighborhoods(await neighborhoodsRes.json());
        }
        if (locationsRes.ok) {
          const locs = await locationsRes.json();
          // Filter to only those without neighborhood
          setLocationsWithoutNeighborhood(locs.filter((l: any) => !l.neighborhoodId));
        }
      } catch (error) {
        console.error("Failed to fetch city:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.cityId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400" />
      </div>
    );
  }

  if (!city) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-400">City not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/travel/cities"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Cities
      </Link>

      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">{city.name}</h1>
        <p className="text-gray-400">{city.country}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div>
            <p className="text-sm text-gray-500">Neighborhoods</p>
            <p className="text-xl font-semibold text-white">{neighborhoods.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Locations</p>
            <p className="text-xl font-semibold text-white">{city.locationCount}</p>
          </div>
          {city.firstVisited && (
            <div>
              <p className="text-sm text-gray-500">First Visit</p>
              <p className="text-xl font-semibold text-white">
                {new Date(city.firstVisited).toLocaleDateString()}
              </p>
            </div>
          )}
          {city.lastVisited && (
            <div>
              <p className="text-sm text-gray-500">Last Visit</p>
              <p className="text-xl font-semibold text-white">
                {new Date(city.lastVisited).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Neighborhoods */}
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <Building2 className="w-5 h-5" />
        Neighborhoods ({neighborhoods.length})
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {neighborhoods.map((neighborhood) => (
          <Link
            key={neighborhood.id}
            href={`/travel/neighborhoods/${neighborhood.id}`}
            className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-cyan-500/50 transition-colors"
          >
            <h3 className="font-medium text-white">{neighborhood.name}</h3>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {neighborhood._count.locations} locations
            </p>
          </Link>
        ))}

        {neighborhoods.length === 0 && (
          <p className="text-gray-500 col-span-full text-center py-4">
            No neighborhoods found
          </p>
        )}
      </div>

      {/* Locations without neighborhood */}
      {locationsWithoutNeighborhood.length > 0 && (
        <>
          <h2 className="text-xl font-semibold text-white mb-4">
            Other Locations ({locationsWithoutNeighborhood.length})
          </h2>

          <div className="space-y-3">
            {locationsWithoutNeighborhood.map((location) => (
              <Link
                key={location.id}
                href={`/travel/locations/${location.id}`}
                className="block bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-white">{location.name}</h3>
                    <p className="text-sm text-gray-400">{location.type}</p>
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
        </>
      )}
    </div>
  );
}
