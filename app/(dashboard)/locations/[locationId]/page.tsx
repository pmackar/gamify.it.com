"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Globe,
  Phone,
  CheckSquare,
  Square,
  Clock,
  DollarSign,
  ExternalLink,
  Utensils,
  Tag,
  Info,
  Star,
} from "lucide-react";

interface Location {
  id: string;
  name: string;
  type: string;
  cuisine?: string;
  address?: string;
  latitude: number;
  longitude: number;
  blurb?: string;
  description?: string;
  website?: string;
  phone?: string;
  hours?: string;
  priceLevel?: number;
  otherInfo?: string;
  visited: boolean;
  hotlist: boolean;
  tags: string[];
  avgRating?: number;
  ratingCount: number;
  city: {
    id: string;
    name: string;
    country: string;
  };
  neighborhood?: {
    id: string;
    name: string;
  };
  visits: Array<{
    id: string;
    date: string;
    overallRating?: number;
    foodQuality?: number;
    serviceRating?: number;
    ambianceRating?: number;
    valueRating?: number;
    notes?: string;
    highlights?: string[];
  }>;
}

function RatingBar({ rating, max = 10 }: { rating: number; max?: number }) {
  const percentage = (rating / max) * 100;
  return (
    <div className="w-full bg-gray-800 rounded-full h-2 mt-1">
      <div
        className="bg-green-500 h-2 rounded-full transition-all"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

function PropertyRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start py-2 border-b border-gray-800/50">
      <div className="flex items-center gap-2 w-40 flex-shrink-0 text-gray-500">
        <Icon className="w-4 h-4" />
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex-1 text-gray-300">{children}</div>
    </div>
  );
}

export default function LocationDetailPage() {
  const params = useParams();
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/locations/${params.locationId}`);
        if (res.ok) {
          setLocation(await res.json());
        }
      } catch (error) {
        console.error("Failed to fetch location:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.locationId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400" />
      </div>
    );
  }

  if (!location) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-400">Location not found</p>
      </div>
    );
  }

  const typeColors: Record<string, string> = {
    RESTAURANT: "bg-orange-500 text-white",
    BAR: "bg-purple-500 text-white",
    CAFE: "bg-amber-600 text-white",
    ATTRACTION: "bg-cyan-500 text-white",
    HOTEL: "bg-blue-500 text-white",
    SHOP: "bg-pink-500 text-white",
    NATURE: "bg-green-500 text-white",
    MUSEUM: "bg-indigo-500 text-white",
    BEACH: "bg-teal-500 text-white",
    NIGHTLIFE: "bg-fuchsia-500 text-white",
    OTHER: "bg-gray-500 text-white",
  };

  const priceLabels: Record<number, string> = {
    1: "$",
    2: "$$",
    3: "$$$",
    4: "$$$$",
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/cities" className="hover:text-white">
          Cities
        </Link>
        <span>/</span>
        <Link href={`/cities/${location.city.id}`} className="hover:text-white">
          {location.city.name}
        </Link>
        {location.neighborhood && (
          <>
            <span>/</span>
            <Link href={`/neighborhoods/${location.neighborhood.id}`} className="hover:text-white">
              {location.neighborhood.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-white truncate max-w-[150px]">{location.name}</span>
      </div>

      {/* Header */}
      <h1 className="text-3xl font-bold text-white mb-4">{location.name}</h1>

      {/* Key Info Row */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm mb-6 pb-4 border-b border-gray-800">
        {location.neighborhood && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Neighborhood</span>
            <Link
              href={`/neighborhoods/${location.neighborhood.id}`}
              className="text-cyan-400 hover:text-cyan-300"
            >
              {location.neighborhood.name}
            </Link>
          </div>
        )}
        {location.address && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="text-gray-300">{location.address}</span>
          </div>
        )}
        {location.cuisine && (
          <div className="flex items-center gap-2">
            <Utensils className="w-4 h-4 text-gray-500" />
            <span className="px-2 py-0.5 bg-gray-700 rounded text-gray-200">
              {location.cuisine}
            </span>
          </div>
        )}
        {location.website && (
          <a
            href={location.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
          >
            <Globe className="w-4 h-4" />
            <span className="truncate max-w-[200px]">
              {location.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Our Rating Section */}
      {location.avgRating && (
        <div className="mb-6">
          <h3 className="text-gray-500 text-sm mb-2 flex items-center gap-2">
            <Star className="w-4 h-4" />
            Our rating
          </h3>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="text-3xl font-bold text-white mb-1">
              {location.avgRating.toFixed(1)}
            </div>
            <RatingBar rating={location.avgRating} />
          </div>
        </div>
      )}

      {/* Properties Section */}
      <div className="mb-6">
        <h3 className="text-gray-400 text-sm font-medium mb-3">Properties</h3>
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg px-4">
          <PropertyRow icon={CheckSquare} label="Have we been he...">
            {location.visited ? (
              <CheckSquare className="w-5 h-5 text-cyan-400 fill-cyan-400" />
            ) : (
              <Square className="w-5 h-5 text-gray-600" />
            )}
          </PropertyRow>

          <PropertyRow icon={Star} label="Hotlist">
            {location.hotlist ? (
              <CheckSquare className="w-5 h-5 text-cyan-400 fill-cyan-400" />
            ) : (
              <Square className="w-5 h-5 text-gray-600" />
            )}
          </PropertyRow>

          {location.blurb && (
            <PropertyRow icon={Info} label="Blurb">
              <span className="text-gray-300">{location.blurb}</span>
            </PropertyRow>
          )}

          <PropertyRow icon={DollarSign} label="Cost">
            {location.priceLevel ? (
              <span className="px-2 py-0.5 bg-green-700 text-green-100 rounded text-sm font-medium">
                {priceLabels[location.priceLevel] || "$".repeat(location.priceLevel)}
              </span>
            ) : (
              <span className="text-gray-600">Empty</span>
            )}
          </PropertyRow>

          <PropertyRow icon={Info} label="Other Info">
            {location.otherInfo || location.description ? (
              <span className="text-gray-300">
                {location.otherInfo || location.description}
              </span>
            ) : (
              <span className="text-gray-600">Empty</span>
            )}
          </PropertyRow>

          <PropertyRow icon={Clock} label="Hours">
            {location.hours ? (
              <span className="text-gray-300">{location.hours}</span>
            ) : (
              <span className="text-gray-600">Empty</span>
            )}
          </PropertyRow>

          <PropertyRow icon={MapPin} label="City">
            <Link
              href={`/cities/${location.city.id}`}
              className="text-cyan-400 hover:text-cyan-300"
            >
              {location.city.name}
            </Link>
          </PropertyRow>

          <PropertyRow icon={Info} label="Rating Count">
            <span className="text-gray-300">{location.ratingCount}</span>
          </PropertyRow>

          <PropertyRow icon={Tag} label="Type">
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                typeColors[location.type] || typeColors.OTHER
              }`}
            >
              {location.type.charAt(0) + location.type.slice(1).toLowerCase()}
            </span>
          </PropertyRow>

          {location.phone && (
            <PropertyRow icon={Phone} label="Phone">
              <a
                href={`tel:${location.phone}`}
                className="text-cyan-400 hover:text-cyan-300"
              >
                {location.phone}
              </a>
            </PropertyRow>
          )}

          {location.tags.length > 0 && (
            <PropertyRow icon={Tag} label="Tags">
              <div className="flex flex-wrap gap-1">
                {location.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </PropertyRow>
          )}
        </div>
      </div>

      {/* Visit Ratings Section */}
      {location.visits.length > 0 && (
        <div className="space-y-4">
          {location.visits.map((visit, index) => (
            <div key={visit.id}>
              <h3 className="text-gray-400 text-sm mb-2 flex items-center gap-2">
                <span className="text-gray-500">#</span>
                Visit {location.visits.length - index} Rating
                <span className="text-gray-600 text-xs">
                  ({new Date(visit.date).toLocaleDateString()})
                </span>
              </h3>
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                {visit.overallRating ? (
                  <>
                    <div className="text-3xl font-bold text-white mb-1">
                      {visit.overallRating}
                    </div>
                    <RatingBar rating={visit.overallRating} />

                    {/* Detailed ratings if available */}
                    {(visit.foodQuality ||
                      visit.serviceRating ||
                      visit.ambianceRating ||
                      visit.valueRating) && (
                      <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-800">
                        {visit.foodQuality && (
                          <div>
                            <span className="text-xs text-gray-500">Food</span>
                            <div className="text-lg font-semibold text-white">
                              {visit.foodQuality}
                            </div>
                            <RatingBar rating={visit.foodQuality} />
                          </div>
                        )}
                        {visit.serviceRating && (
                          <div>
                            <span className="text-xs text-gray-500">Service</span>
                            <div className="text-lg font-semibold text-white">
                              {visit.serviceRating}
                            </div>
                            <RatingBar rating={visit.serviceRating} />
                          </div>
                        )}
                        {visit.ambianceRating && (
                          <div>
                            <span className="text-xs text-gray-500">Ambiance</span>
                            <div className="text-lg font-semibold text-white">
                              {visit.ambianceRating}
                            </div>
                            <RatingBar rating={visit.ambianceRating} />
                          </div>
                        )}
                        {visit.valueRating && (
                          <div>
                            <span className="text-xs text-gray-500">Value</span>
                            <div className="text-lg font-semibold text-white">
                              {visit.valueRating}
                            </div>
                            <RatingBar rating={visit.valueRating} />
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-gray-600">No rating</span>
                )}

                {visit.notes && (
                  <p className="text-gray-400 mt-3 pt-3 border-t border-gray-800 text-sm">
                    {visit.notes}
                  </p>
                )}

                {visit.highlights && visit.highlights.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {visit.highlights.map((highlight) => (
                      <span
                        key={highlight}
                        className="px-2 py-0.5 bg-cyan-900/30 text-cyan-400 rounded text-xs"
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {location.visits.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No visits recorded yet</p>
        </div>
      )}
    </div>
  );
}
