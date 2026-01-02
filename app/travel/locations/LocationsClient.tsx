"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { MapPin, Star, Filter, Plus, ChevronRight, X, LayoutGrid, List, Loader2 } from "lucide-react";

interface Location {
  id: string;
  name: string;
  type: string;
  address: string | null;
  avgRating: number | null;
  ratingCount: number;
  visited: boolean;
  hotlist: boolean;
  totalVisits: number;
  city: {
    name: string;
    country: string;
  };
  _count?: {
    visits: number;
    photos: number;
  };
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface InitialData {
  data: Location[];
  pagination: Pagination;
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

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  RESTAURANT: { bg: 'rgba(239, 68, 68, 0.2)', border: '#ef4444', text: '#ef4444' },
  BAR: { bg: 'rgba(168, 85, 247, 0.2)', border: '#a855f7', text: '#a855f7' },
  CAFE: { bg: 'rgba(249, 115, 22, 0.2)', border: '#f97316', text: '#f97316' },
  ATTRACTION: { bg: 'rgba(6, 182, 212, 0.2)', border: '#06b6d4', text: '#06b6d4' },
  HOTEL: { bg: 'rgba(59, 130, 246, 0.2)', border: '#3b82f6', text: '#3b82f6' },
  SHOP: { bg: 'rgba(139, 92, 246, 0.2)', border: '#8b5cf6', text: '#8b5cf6' },
  NATURE: { bg: 'rgba(34, 197, 94, 0.2)', border: '#22c55e', text: '#22c55e' },
  MUSEUM: { bg: 'rgba(245, 158, 11, 0.2)', border: '#f59e0b', text: '#f59e0b' },
  BEACH: { bg: 'rgba(20, 184, 166, 0.2)', border: '#14b8a6', text: '#14b8a6' },
  NIGHTLIFE: { bg: 'rgba(244, 63, 94, 0.2)', border: '#f43f5e', text: '#f43f5e' },
  OTHER: { bg: 'rgba(107, 114, 128, 0.2)', border: '#6b7280', text: '#6b7280' },
};

export default function LocationsClient({ initialData }: { initialData: InitialData }) {
  const searchParams = useSearchParams();
  const [locations, setLocations] = useState<Location[]>(initialData.data);
  const [pagination, setPagination] = useState<Pagination>(initialData.pagination);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [visitedFilter, setVisitedFilter] = useState<boolean | null>(null);
  const [hotlistFilter, setHotlistFilter] = useState<boolean | null>(null);
  const [viewMode, setViewMode] = useState<'sheet' | 'list'>('sheet');
  const [isFiltering, setIsFiltering] = useState(false);

  // Build API URL with filters
  const buildApiUrl = useCallback((offset = 0) => {
    const params = new URLSearchParams();
    params.set("limit", "50");
    params.set("offset", offset.toString());
    if (selectedType) params.set("type", selectedType);
    if (visitedFilter === true) params.set("visited", "true");
    else if (visitedFilter === false) params.set("visited", "false");
    if (hotlistFilter === true) params.set("hotlist", "true");
    if (searchQuery) params.set("search", searchQuery);
    return `/api/locations?${params.toString()}`;
  }, [selectedType, visitedFilter, hotlistFilter, searchQuery]);

  // Fetch locations with server-side filtering
  const fetchLocations = useCallback(async (append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setIsFiltering(true);
      }

      const offset = append ? pagination.offset + pagination.limit : 0;
      const res = await fetch(buildApiUrl(offset));

      if (res.ok) {
        const result = await res.json();
        if (append) {
          setLocations(prev => [...prev, ...result.data]);
        } else {
          setLocations(result.data);
        }
        setPagination(result.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    } finally {
      setLoadingMore(false);
      setIsFiltering(false);
    }
  }, [buildApiUrl, pagination]);

  // Read URL params on mount
  useEffect(() => {
    const typeParam = searchParams.get("type");
    const visitedParam = searchParams.get("visited");
    const hotlistParam = searchParams.get("hotlist");

    if (typeParam) {
      setSelectedType(typeParam.toUpperCase());
      setShowFilters(true);
    }
    if (visitedParam === "true") {
      setVisitedFilter(true);
      setShowFilters(true);
    }
    if (hotlistParam === "true") {
      setHotlistFilter(true);
      setShowFilters(true);
    }
  }, [searchParams]);

  // Fetch when filters change (but not on initial mount)
  const hasFilters = selectedType || visitedFilter !== null || hotlistFilter !== null || searchQuery;
  useEffect(() => {
    if (hasFilters) {
      fetchLocations(false);
    }
  }, [selectedType, visitedFilter, hotlistFilter, searchQuery]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const toggleType = (type: string) => {
    setSelectedType(prev => prev === type ? null : type);
  };

  const loadMore = () => {
    if (pagination?.hasMore && !loadingMore) {
      fetchLocations(true);
    }
  };

  const clearFilters = () => {
    setSelectedType(null);
    setVisitedFilter(null);
    setHotlistFilter(null);
    setSearchInput("");
    setSearchQuery("");
    // Reset to initial data
    setLocations(initialData.data);
    setPagination(initialData.pagination);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-lg mb-2" style={{ color: 'var(--rpg-teal)', textShadow: '0 0 10px var(--rpg-teal-glow)' }}>
            Locations
          </h1>
          <p className="text-[0.55rem]" style={{ color: 'var(--rpg-muted)' }}>
            {pagination.total} places visited or on your list
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
          <Link href="/travel/locations/new" className="rpg-btn flex items-center justify-center gap-2">
            <Plus className="w-3 h-3" />
            Add Location
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search locations..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="rpg-input w-full"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="rpg-btn rpg-btn-secondary flex items-center justify-center gap-2"
          style={{
            background: showFilters || selectedType || visitedFilter !== null || hotlistFilter !== null ? 'var(--rpg-teal)' : 'var(--rpg-card)',
            color: showFilters || selectedType || visitedFilter !== null || hotlistFilter !== null ? 'var(--rpg-bg-dark)' : 'var(--rpg-text)',
          }}
        >
          <Filter className="w-3 h-3" />
          Filter
          {(selectedType || visitedFilter !== null || hotlistFilter !== null) && (
            <span
              className="px-2 py-0.5 rounded text-[0.45rem]"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              {[selectedType, visitedFilter !== null, hotlistFilter !== null].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Filter Pills */}
      {showFilters && (
        <div
          className="flex flex-wrap gap-2 mb-6 p-4 rounded-lg"
          style={{ background: 'var(--rpg-card)', border: '2px solid var(--rpg-border)' }}
        >
          {/* Status filters */}
          <button
            onClick={() => setVisitedFilter(visitedFilter === true ? null : true)}
            className="px-3 py-1.5 rounded text-[0.5rem] transition-colors"
            style={{
              background: visitedFilter === true ? '#22c55e' : 'var(--rpg-bg-dark)',
              color: visitedFilter === true ? 'var(--rpg-bg-dark)' : 'var(--rpg-muted)',
              border: `2px solid ${visitedFilter === true ? '#16a34a' : 'var(--rpg-border)'}`,
            }}
          >
            Visited
          </button>
          <button
            onClick={() => setHotlistFilter(hotlistFilter === true ? null : true)}
            className="px-3 py-1.5 rounded text-[0.5rem] transition-colors"
            style={{
              background: hotlistFilter === true ? '#ef4444' : 'var(--rpg-bg-dark)',
              color: hotlistFilter === true ? 'white' : 'var(--rpg-muted)',
              border: `2px solid ${hotlistFilter === true ? '#dc2626' : 'var(--rpg-border)'}`,
            }}
          >
            Hotlist
          </button>
          <div className="w-px h-6 self-center" style={{ background: 'var(--rpg-border)' }} />
          {/* Type filters */}
          {LOCATION_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className="px-3 py-1.5 rounded text-[0.5rem] transition-colors capitalize"
              style={{
                background: selectedType === type ? 'var(--rpg-teal)' : 'var(--rpg-bg-dark)',
                color: selectedType === type ? 'var(--rpg-bg-dark)' : 'var(--rpg-muted)',
                border: `2px solid ${selectedType === type ? 'var(--rpg-teal-dark)' : 'var(--rpg-border)'}`,
              }}
            >
              {type.toLowerCase()}
            </button>
          ))}
          {(selectedType || visitedFilter !== null || hotlistFilter !== null) && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-1.5 text-[0.5rem]"
              style={{ color: 'var(--rpg-muted)' }}
            >
              <X className="w-3 h-3" />
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Loading indicator for filtering */}
      {isFiltering && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--rpg-teal)' }} />
        </div>
      )}

      {/* Results */}
      {!isFiltering && locations.length === 0 ? (
        <div className="text-center py-16">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-lg mb-4"
            style={{ background: 'var(--rpg-card)', border: '2px solid var(--rpg-border)' }}
          >
            <MapPin className="w-8 h-8" style={{ color: 'var(--rpg-muted)' }} />
          </div>
          <h2 className="text-sm mb-2" style={{ color: 'var(--rpg-text)' }}>
            {pagination.total === 0 ? "No locations yet" : "No matching locations"}
          </h2>
          <p className="text-[0.5rem] mb-6" style={{ color: 'var(--rpg-muted)' }}>
            {pagination.total === 0
              ? "Add places you've visited or want to explore"
              : "Try adjusting your filters or search query"}
          </p>
          {pagination.total === 0 && (
            <Link href="/travel/locations/new" className="rpg-btn">
              <Plus className="w-3 h-3 inline mr-2" />
              Add Your First Location
            </Link>
          )}
        </div>
      ) : !isFiltering && viewMode === 'sheet' ? (
        /* Sheet/Grid View */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((location) => (
            <Link
              key={location.id}
              href={`/travel/locations/${location.id}`}
              className="group rounded-lg p-5 transition-all"
              style={{
                background: 'var(--rpg-card)',
                border: '2px solid var(--rpg-border)',
                boxShadow: '0 4px 0 rgba(0, 0, 0, 0.3)',
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3
                    className="text-[0.65rem] truncate transition-colors"
                    style={{ color: 'var(--rpg-text)' }}
                  >
                    {location.name}
                  </h3>
                  <p className="text-[0.5rem] truncate" style={{ color: 'var(--rpg-muted)' }}>
                    {location.city.name}, {location.city.country}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--rpg-muted)' }} />
              </div>

              <div className="flex items-center gap-3 mb-3">
                <span
                  className="px-2 py-1 rounded text-[0.45rem] capitalize"
                  style={{
                    background: TYPE_COLORS[location.type]?.bg || TYPE_COLORS.OTHER.bg,
                    border: `1px solid ${TYPE_COLORS[location.type]?.border || TYPE_COLORS.OTHER.border}`,
                    color: TYPE_COLORS[location.type]?.text || TYPE_COLORS.OTHER.text,
                  }}
                >
                  {location.type.toLowerCase()}
                </span>
                {location.avgRating && (
                  <span className="flex items-center gap-1 text-[0.5rem]" style={{ color: 'var(--rpg-gold)' }}>
                    <Star className="w-3 h-3 fill-current" />
                    {location.avgRating.toFixed(1)}
                  </span>
                )}
              </div>

              <p className="text-[0.45rem]" style={{ color: 'var(--rpg-muted)' }}>
                {location.totalVisits || location._count?.visits || 0} visit{(location.totalVisits || location._count?.visits || 0) !== 1 ? "s" : ""}
                {(location._count?.photos ?? 0) > 0 &&
                  ` · ${location._count?.photos} photo${(location._count?.photos ?? 0) !== 1 ? "s" : ""}`}
              </p>
            </Link>
          ))}
        </div>
      ) : !isFiltering ? (
        /* List View */
        <div className="rounded-lg overflow-hidden" style={{ border: '2px solid var(--rpg-border)' }}>
          {locations.map((location, index) => (
            <Link
              key={location.id}
              href={`/travel/locations/${location.id}`}
              className="flex items-center gap-4 p-4 transition-all hover:bg-opacity-50"
              style={{
                background: index % 2 === 0 ? 'var(--rpg-card)' : 'var(--rpg-bg-dark)',
                borderBottom: index < locations.length - 1 ? '1px solid var(--rpg-border)' : 'none',
              }}
            >
              {/* Type Badge */}
              <span
                className="px-2 py-1 rounded text-[0.45rem] capitalize flex-shrink-0 w-24 text-center"
                style={{
                  background: TYPE_COLORS[location.type]?.bg || TYPE_COLORS.OTHER.bg,
                  border: `1px solid ${TYPE_COLORS[location.type]?.border || TYPE_COLORS.OTHER.border}`,
                  color: TYPE_COLORS[location.type]?.text || TYPE_COLORS.OTHER.text,
                }}
              >
                {location.type.toLowerCase()}
              </span>

              {/* Name & Location */}
              <div className="flex-1 min-w-0">
                <h3 className="text-[0.6rem] truncate" style={{ color: 'var(--rpg-text)' }}>
                  {location.name}
                </h3>
                <p className="text-[0.5rem] truncate" style={{ color: 'var(--rpg-muted)' }}>
                  {location.city.name}, {location.city.country}
                </p>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 flex-shrink-0">
                {location.avgRating && (
                  <span className="flex items-center gap-1 text-[0.5rem]" style={{ color: 'var(--rpg-gold)' }}>
                    <Star className="w-3 h-3 fill-current" />
                    {location.avgRating.toFixed(1)}
                  </span>
                )}
                <span className="text-[0.45rem]" style={{ color: 'var(--rpg-muted)' }}>
                  {location.totalVisits || location._count?.visits || 0} visits
                </span>
                <ChevronRight className="w-4 h-4" style={{ color: 'var(--rpg-muted)' }} />
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      {/* Load More Button */}
      {pagination?.hasMore && !isFiltering && (
        <div className="flex justify-center mt-8">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="rpg-btn rpg-btn-secondary flex items-center gap-2"
            style={{ minWidth: '200px' }}
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                Load More
                <span className="text-[0.45rem]" style={{ color: 'var(--rpg-muted)' }}>
                  ({locations.length} of {pagination.total})
                </span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
