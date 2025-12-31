"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, MapPin, Calendar, ChevronRight, Plus } from "lucide-react";

interface City {
  id: string;
  name: string;
  country: string;
  region: string | null;
  visitCount: number;
  locationCount: number;
  firstVisited: string | null;
  lastVisited: string | null;
  _count: {
    locations: number;
  };
}

export default function CitiesPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Group cities by country
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Cities</h1>
          <p className="text-gray-400">
            {cities.length} cities across {Object.keys(citiesByCountry).length} countries
          </p>
        </div>
        <Link
          href="/locations/new"
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Location
        </Link>
      </div>

      {cities.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 mb-4">
            <Building2 className="w-8 h-8 text-gray-600" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No cities yet</h2>
          <p className="text-gray-400 mb-6">
            Start adding locations to see your cities here
          </p>
          <Link
            href="/locations/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Your First Location
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(citiesByCountry)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([country, countryCities]) => (
              <div key={country}>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">
                    {getCountryFlag(country)}
                  </span>
                  {country}
                  <span className="text-sm font-normal text-gray-500">
                    ({countryCities.length} {countryCities.length === 1 ? "city" : "cities"})
                  </span>
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {countryCities.map((city) => (
                    <Link
                      key={city.id}
                      href={`/cities/${city.id}`}
                      className="group bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-cyan-500/50 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
                            {city.name}
                          </h3>
                          {city.region && (
                            <p className="text-sm text-gray-500">{city.region}</p>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-cyan-400 transition-colors" />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {city._count.locations} locations
                        </span>
                        {city.lastVisited && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
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
      )}
    </div>
  );
}

// Simple function to get country flag emoji from country name
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
