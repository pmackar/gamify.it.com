"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  X,
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

interface LocationDetail {
  id: string;
  name: string;
  type: string;
  neighborhood?: string;
  cuisine?: string;
  address?: string;
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
  visits: Array<{
    id: string;
    date: string;
    overallRating?: number;
    notes?: string;
  }>;
}

interface LocationDetailModalProps {
  locationId: string | null;
  onClose: () => void;
}

function RatingBar({ rating, max = 10 }: { rating: number; max?: number }) {
  const percentage = (rating / max) * 100;
  return (
    <div className="w-full bg-gray-800 rounded-full h-2 mt-1">
      <div
        className="bg-green-500 h-2 rounded-full"
        style={{ width: `${percentage}%` }}
      />
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

export default function LocationDetailModal({
  locationId,
  onClose,
}: LocationDetailModalProps) {
  const [location, setLocation] = useState<LocationDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!locationId) {
      setLocation(null);
      return;
    }

    async function fetchLocation() {
      setLoading(true);
      try {
        const res = await fetch(`/api/locations/${locationId}`);
        if (res.ok) {
          setLocation(await res.json());
        }
      } catch (error) {
        console.error("Failed to fetch location:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchLocation();
  }, [locationId]);

  if (!locationId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 pointer-events-auto"
        onClick={onClose}
      />

      {/* Modal Panel */}
      <div className="relative w-full max-w-md h-full bg-gray-900 border-l border-gray-800 overflow-y-auto pointer-events-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400" />
          </div>
        ) : location ? (
          <div className="p-6">
            {/* Header */}
            <h2 className="text-2xl font-bold text-white pr-12 mb-2">
              {location.name}
            </h2>

            {/* Type Badge */}
            <span
              className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-4 ${
                typeColors[location.type] || typeColors.OTHER
              }`}
            >
              {location.type.charAt(0) + location.type.slice(1).toLowerCase()}
            </span>

            {/* Key Info */}
            <div className="space-y-2 text-sm mb-6">
              {location.neighborhood && (
                <div className="flex items-center gap-2 text-gray-400">
                  <MapPin className="w-4 h-4" />
                  <span>{location.neighborhood}</span>
                </div>
              )}
              {location.address && (
                <div className="flex items-center gap-2 text-gray-400">
                  <MapPin className="w-4 h-4 opacity-0" />
                  <span className="text-gray-500">{location.address}</span>
                </div>
              )}
              {location.cuisine && (
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">{location.cuisine}</span>
                </div>
              )}
              {location.website && (
                <a
                  href={location.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300"
                >
                  <Globe className="w-4 h-4" />
                  <span className="truncate">
                    {location.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {location.phone && (
                <a
                  href={`tel:${location.phone}`}
                  className="flex items-center gap-2 text-gray-400 hover:text-white"
                >
                  <Phone className="w-4 h-4" />
                  <span>{location.phone}</span>
                </a>
              )}
            </div>

            {/* Rating */}
            {location.avgRating && (
              <div className="mb-6">
                <div className="text-gray-500 text-xs mb-1 flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  Our Rating
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="text-2xl font-bold text-white mb-1">
                    {location.avgRating.toFixed(1)}
                  </div>
                  <RatingBar rating={location.avgRating} />
                </div>
              </div>
            )}

            {/* Blurb */}
            {location.blurb && (
              <div className="mb-6">
                <div className="text-gray-500 text-xs mb-1 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  About
                </div>
                <p className="text-gray-300 text-sm">{location.blurb}</p>
              </div>
            )}

            {/* Properties */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Visited</span>
                {location.visited ? (
                  <CheckSquare className="w-5 h-5 text-cyan-400" />
                ) : (
                  <Square className="w-5 h-5 text-gray-600" />
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Hotlist</span>
                {location.hotlist ? (
                  <CheckSquare className="w-5 h-5 text-cyan-400" />
                ) : (
                  <Square className="w-5 h-5 text-gray-600" />
                )}
              </div>
              {location.priceLevel && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Price</span>
                  <span className="px-2 py-0.5 bg-green-700 text-green-100 rounded text-xs font-medium">
                    {priceLabels[location.priceLevel]}
                  </span>
                </div>
              )}
              {location.hours && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Hours</span>
                  <span className="text-gray-300">{location.hours}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {location.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-6">
                {location.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Recent Visits */}
            {location.visits.length > 0 && (
              <div className="mb-6">
                <div className="text-gray-500 text-xs mb-2">
                  Recent Visits ({location.visits.length})
                </div>
                <div className="space-y-2">
                  {location.visits.slice(0, 3).map((visit) => (
                    <div
                      key={visit.id}
                      className="bg-gray-800 rounded-lg p-3 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">
                          {new Date(visit.date).toLocaleDateString()}
                        </span>
                        {visit.overallRating && (
                          <span className="text-yellow-400">
                            ★ {visit.overallRating}
                          </span>
                        )}
                      </div>
                      {visit.notes && (
                        <p className="text-gray-500 mt-1 text-xs line-clamp-2">
                          {visit.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full Page Link */}
            <Link
              href={`/locations/${location.id}`}
              className="block w-full text-center py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
            >
              View Full Details
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            Location not found
          </div>
        )}
      </div>
    </div>
  );
}
