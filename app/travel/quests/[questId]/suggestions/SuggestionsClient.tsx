"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Users, Check, Loader2, Lightbulb, Search, X, MapPin, Heart, Globe, Building2 } from "lucide-react";
import TravelApp from "../../../TravelApp";

interface Suggestion {
  location: {
    id: string;
    name: string;
    type: string;
    latitude: number | null;
    longitude: number | null;
    city: {
      id: string;
      name: string;
      country: string;
    } | null;
    neighborhood: {
      id: string;
      name: string;
    } | null;
  };
  wantedBy: Array<{
    userId: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  }>;
  wantedCount: number;
  isInQuest: boolean;
}

type ScopeType = "hotlist" | "neighborhood" | "city" | "all";

interface SuggestionsClientProps {
  questId: string;
}

// Type styling with solid backgrounds and contrast text
const LOCATION_TYPE_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  restaurant: { bg: "#E53E3E", text: "#FFFFFF", icon: "🍽️" },
  cafe: { bg: "#DD6B20", text: "#FFFFFF", icon: "☕" },
  bar: { bg: "#805AD5", text: "#FFFFFF", icon: "🍺" },
  museum: { bg: "#3182CE", text: "#FFFFFF", icon: "🏛️" },
  park: { bg: "#38A169", text: "#FFFFFF", icon: "🌳" },
  landmark: { bg: "#D69E2E", text: "#1A1A1A", icon: "🏰" },
  shop: { bg: "#D53F8C", text: "#FFFFFF", icon: "🛍️" },
  hotel: { bg: "#319795", text: "#FFFFFF", icon: "🏨" },
  beach: { bg: "#00B5D8", text: "#1A1A1A", icon: "🏖️" },
  other: { bg: "#718096", text: "#FFFFFF", icon: "📍" },
};

export default function SuggestionsClient({ questId }: SuggestionsClientProps) {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingLocation, setAddingLocation] = useState<string | null>(null);

  // Scope and search state
  const [scope, setScope] = useState<ScopeType>("hotlist");
  const [apiSearch, setApiSearch] = useState("");
  const [questCities, setQuestCities] = useState<Array<{ id: string; name: string; country: string }>>([]);
  const [questNeighborhoods, setQuestNeighborhoods] = useState<Array<{ id: string; name: string }>>([]);

  // Filter state (client-side filtering of results)
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);

  // Determine initial scope based on quest data
  const determineInitialScope = useCallback((neighborhoods: Array<{ id: string; name: string }>) => {
    // Start with most granular: neighborhood if available
    if (neighborhoods.length > 0) {
      return "neighborhood";
    }
    return "hotlist";
  }, []);

  const fetchSuggestions = useCallback(async (fetchScope: ScopeType, search?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ scope: fetchScope });
      if (search) {
        params.set("search", search);
      }
      const response = await fetch(`/api/quests/${questId}/suggestions?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch suggestions");
      }
      const data = await response.json();
      setSuggestions(data.suggestions || []);
      setQuestCities(data.questCities || []);
      setQuestNeighborhoods(data.questNeighborhoods || []);

      // Set initial scope based on quest data (only on first load)
      if (scope === "hotlist" && data.questNeighborhoods?.length > 0) {
        const initialScope = determineInitialScope(data.questNeighborhoods);
        if (initialScope !== "hotlist") {
          setScope(initialScope);
          // Refetch with correct scope
          const newParams = new URLSearchParams({ scope: initialScope });
          const newResponse = await fetch(`/api/quests/${questId}/suggestions?${newParams}`);
          if (newResponse.ok) {
            const newData = await newResponse.json();
            setSuggestions(newData.suggestions || []);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [questId, scope, determineInitialScope]);

  useEffect(() => {
    fetchSuggestions(scope, apiSearch);
  }, [questId]);

  // Refetch when scope changes
  const handleScopeChange = (newScope: ScopeType) => {
    setScope(newScope);
    fetchSuggestions(newScope, apiSearch);
  };

  // Handle API search (debounced)
  const handleApiSearch = (search: string) => {
    setApiSearch(search);
    fetchSuggestions(scope, search);
  };

  // Get unique types and cities for filters
  const { availableTypes, availableCities } = useMemo(() => {
    const types = new Set<string>();
    const cities = new Map<string, { id: string; name: string }>();

    suggestions.forEach((s) => {
      types.add(s.location.type);
      if (s.location.city) {
        cities.set(s.location.city.id, s.location.city);
      }
    });

    return {
      availableTypes: Array.from(types).sort(),
      availableCities: Array.from(cities.values()).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [suggestions]);

  // Filter suggestions
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((s) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = s.location.name.toLowerCase().includes(query);
        const matchesNeighborhood = s.location.neighborhood?.name.toLowerCase().includes(query);
        const matchesCity = s.location.city?.name.toLowerCase().includes(query);
        if (!matchesName && !matchesNeighborhood && !matchesCity) {
          return false;
        }
      }

      // Type filter
      if (selectedTypes.length > 0 && !selectedTypes.includes(s.location.type)) {
        return false;
      }

      // City filter
      if (selectedCities.length > 0 && s.location.city && !selectedCities.includes(s.location.city.id)) {
        return false;
      }

      return true;
    });
  }, [suggestions, searchQuery, selectedTypes, selectedCities]);

  const addToQuest = async (locationId: string) => {
    setAddingLocation(locationId);

    try {
      const response = await fetch(`/api/quests/${questId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId }),
      });

      if (response.ok) {
        // Mark as in quest
        setSuggestions((prev) =>
          prev.map((s) =>
            s.location.id === locationId ? { ...s, isInQuest: true } : s
          )
        );
      }
    } catch (err) {
      console.error("Failed to add to quest:", err);
    } finally {
      setAddingLocation(null);
    }
  };

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleCity = (cityId: string) => {
    setSelectedCities((prev) =>
      prev.includes(cityId) ? prev.filter((c) => c !== cityId) : [...prev, cityId]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTypes([]);
    setSelectedCities([]);
  };

  const hasActiveFilters = searchQuery || selectedTypes.length > 0 || selectedCities.length > 0;

  const notInQuestSuggestions = filteredSuggestions.filter((s) => !s.isInQuest);
  const inQuestSuggestions = filteredSuggestions.filter((s) => s.isInQuest);

  return (
    <TravelApp isLoggedIn={true}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href={`/travel/quests/${questId}`}
            className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--rpg-muted)" }}
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1
              className="text-xl md:text-2xl flex items-center gap-2"
              style={{ color: "var(--rpg-text)", textShadow: "0 0 10px rgba(255, 255, 255, 0.3)" }}
            >
              <Lightbulb size={24} style={{ color: "var(--rpg-gold)" }} />
              Add Locations
            </h1>
            <p className="text-sm" style={{ color: "var(--rpg-muted)" }}>
              Search and add locations to your quest
            </p>
          </div>
        </div>

        {/* Scope Toggle */}
        <div
          className="rounded-lg p-3 mb-4"
          style={{
            background: "var(--rpg-card)",
            border: "2px solid var(--rpg-border)",
          }}
        >
          <p className="text-xs mb-2" style={{ color: "var(--rpg-muted)" }}>
            Browse locations:
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleScopeChange("hotlist")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all"
              style={{
                background: scope === "hotlist" ? "rgba(255, 107, 107, 0.2)" : "var(--rpg-darker)",
                border: scope === "hotlist" ? "2px solid #ff6b6b" : "2px solid var(--rpg-border)",
                color: scope === "hotlist" ? "#ff6b6b" : "var(--rpg-muted)",
              }}
            >
              <Heart size={14} style={{ fill: scope === "hotlist" ? "#ff6b6b" : "none" }} />
              Party Hotlist
            </button>
            {questNeighborhoods.length > 0 && (
              <button
                onClick={() => handleScopeChange("neighborhood")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all"
                style={{
                  background: scope === "neighborhood" ? "rgba(95, 191, 138, 0.2)" : "var(--rpg-darker)",
                  border: scope === "neighborhood" ? "2px solid var(--rpg-teal)" : "2px solid var(--rpg-border)",
                  color: scope === "neighborhood" ? "var(--rpg-teal)" : "var(--rpg-muted)",
                }}
              >
                <MapPin size={14} />
                {questNeighborhoods.length === 1
                  ? questNeighborhoods[0].name
                  : `${questNeighborhoods.length} Neighborhoods`}
              </button>
            )}
            {questCities.length > 0 && (
              <button
                onClick={() => handleScopeChange("city")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all"
                style={{
                  background: scope === "city" ? "rgba(99, 102, 241, 0.2)" : "var(--rpg-darker)",
                  border: scope === "city" ? "2px solid var(--rpg-purple)" : "2px solid var(--rpg-border)",
                  color: scope === "city" ? "var(--rpg-purple)" : "var(--rpg-muted)",
                }}
              >
                <Building2 size={14} />
                {questCities.length === 1
                  ? questCities[0].name
                  : `${questCities.length} Cities`}
              </button>
            )}
            <button
              onClick={() => handleScopeChange("all")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all"
              style={{
                background: scope === "all" ? "rgba(255, 215, 0, 0.2)" : "var(--rpg-darker)",
                border: scope === "all" ? "2px solid var(--rpg-gold)" : "2px solid var(--rpg-border)",
                color: scope === "all" ? "var(--rpg-gold)" : "var(--rpg-muted)",
              }}
            >
              <Globe size={14} />
              All Locations
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin" style={{ color: "var(--rpg-teal)" }} />
          </div>
        ) : error ? (
          <div
            className="p-4 rounded-lg text-center"
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "2px solid rgba(239, 68, 68, 0.3)",
              color: "#ef4444",
            }}
          >
            {error}
          </div>
        ) : suggestions.length === 0 ? (
          <div
            className="text-center py-12 rounded-lg"
            style={{
              background: "var(--rpg-card)",
              border: "2px solid var(--rpg-border)",
            }}
          >
            <Lightbulb size={48} className="mx-auto mb-4" style={{ color: "var(--rpg-muted)" }} />
            <h2 className="text-lg mb-2" style={{ color: "var(--rpg-text)" }}>
              {scope === "hotlist"
                ? "No hotlisted locations"
                : `No locations found`}
            </h2>
            <p className="text-sm mb-4" style={{ color: "var(--rpg-muted)" }}>
              {scope === "hotlist"
                ? "Add locations to your hotlist to see them here, or expand your search scope"
                : "Try searching or switching to a different scope"}
            </p>
            <Link
              href={`/travel/locations/new?addToQuest=${questId}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
              style={{
                background: "var(--rpg-teal)",
                color: "white",
              }}
            >
              <Plus size={16} />
              Create New Location
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filters Section */}
            <div
              className="rounded-lg p-4"
              style={{
                background: "var(--rpg-card)",
                border: "2px solid var(--rpg-border)",
              }}
            >
              {/* Search */}
              <div className="relative mb-4">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--rpg-muted)" }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search locations..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm"
                  style={{
                    background: "var(--rpg-darker)",
                    border: "2px solid var(--rpg-border)",
                    color: "var(--rpg-text)",
                    outline: "none",
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--rpg-muted)" }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Type Filters */}
              {availableTypes.length > 1 && (
                <div className="mb-3">
                  <p className="text-xs mb-2" style={{ color: "var(--rpg-muted)" }}>
                    Filter by type:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableTypes.map((type) => {
                      const style = LOCATION_TYPE_STYLES[type] || LOCATION_TYPE_STYLES.other;
                      const isSelected = selectedTypes.includes(type);
                      return (
                        <button
                          key={type}
                          onClick={() => toggleType(type)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={{
                            background: isSelected ? style.bg : "var(--rpg-darker)",
                            color: isSelected ? style.text : "var(--rpg-muted)",
                            border: isSelected ? `2px solid ${style.bg}` : "2px solid var(--rpg-border)",
                            opacity: isSelected ? 1 : 0.8,
                          }}
                        >
                          <span>{style.icon}</span>
                          <span className="capitalize">{type}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* City Filters */}
              {availableCities.length > 1 && (
                <div className="mb-3">
                  <p className="text-xs mb-2" style={{ color: "var(--rpg-muted)" }}>
                    Filter by city:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableCities.map((city) => {
                      const isSelected = selectedCities.includes(city.id);
                      return (
                        <button
                          key={city.id}
                          onClick={() => toggleCity(city.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all"
                          style={{
                            background: isSelected ? "var(--rpg-teal)" : "var(--rpg-darker)",
                            color: isSelected ? "white" : "var(--rpg-muted)",
                            border: isSelected ? "2px solid var(--rpg-teal)" : "2px solid var(--rpg-border)",
                          }}
                        >
                          <MapPin size={12} />
                          <span>{city.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs flex items-center gap-1"
                  style={{ color: "var(--rpg-muted)" }}
                >
                  <X size={12} />
                  Clear all filters
                </button>
              )}

              {/* Results count */}
              <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--rpg-border)" }}>
                <p className="text-xs" style={{ color: "var(--rpg-muted)" }}>
                  Showing {filteredSuggestions.length} of {suggestions.length} suggestions
                </p>
              </div>
            </div>

            {/* Results */}
            {filteredSuggestions.length === 0 ? (
              <div
                className="text-center py-8 rounded-lg"
                style={{
                  background: "var(--rpg-card)",
                  border: "2px solid var(--rpg-border)",
                }}
              >
                <Search size={32} className="mx-auto mb-3" style={{ color: "var(--rpg-muted)" }} />
                <p style={{ color: "var(--rpg-muted)" }}>No locations match your filters</p>
                <button
                  onClick={clearFilters}
                  className="mt-2 text-sm"
                  style={{ color: "var(--rpg-teal)" }}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Not in quest */}
                {notInQuestSuggestions.length > 0 && (
                  <section>
                    <h2
                      className="text-base font-medium mb-4 flex items-center gap-2"
                      style={{ color: "var(--rpg-text)" }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: "var(--rpg-gold)" }}
                      />
                      Available to Add
                      <span
                        className="ml-auto text-xs px-2 py-0.5 rounded"
                        style={{ background: "var(--rpg-border)", color: "var(--rpg-muted)" }}
                      >
                        {notInQuestSuggestions.length}
                      </span>
                    </h2>

                    <div className="space-y-2">
                      {notInQuestSuggestions.map((suggestion) => (
                        <SuggestionCard
                          key={suggestion.location.id}
                          suggestion={suggestion}
                          onAdd={() => addToQuest(suggestion.location.id)}
                          isAdding={addingLocation === suggestion.location.id}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Already in quest */}
                {inQuestSuggestions.length > 0 && (
                  <section>
                    <h2
                      className="text-base font-medium mb-4 flex items-center gap-2"
                      style={{ color: "var(--rpg-text)" }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: "var(--rpg-teal)" }}
                      />
                      Already in Quest
                      <span
                        className="ml-auto text-xs px-2 py-0.5 rounded"
                        style={{ background: "var(--rpg-border)", color: "var(--rpg-muted)" }}
                      >
                        {inQuestSuggestions.length}
                      </span>
                    </h2>

                    <div className="space-y-2 opacity-60">
                      {inQuestSuggestions.map((suggestion) => (
                        <SuggestionCard
                          key={suggestion.location.id}
                          suggestion={suggestion}
                          isInQuest
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </TravelApp>
  );
}

function SuggestionCard({
  suggestion,
  onAdd,
  isAdding,
  isInQuest,
}: {
  suggestion: Suggestion;
  onAdd?: () => void;
  isAdding?: boolean;
  isInQuest?: boolean;
}) {
  const typeStyle = LOCATION_TYPE_STYLES[suggestion.location.type] || LOCATION_TYPE_STYLES.other;

  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-lg"
      style={{
        background: "var(--rpg-card)",
        border: "2px solid var(--rpg-border)",
      }}
    >
      {/* Top row: Name and add button */}
      <div className="flex items-start gap-3">
        {/* Location info */}
        <Link href={`/travel/locations/${suggestion.location.id}`} className="flex-1 min-w-0">
          <span className="text-base block mb-1" style={{ color: "var(--rpg-text)" }}>
            {suggestion.location.name}
          </span>
        </Link>

        {/* Add button or check */}
        {isInQuest ? (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "var(--rpg-teal)" }}
          >
            <Check size={16} color="white" />
          </div>
        ) : (
          <button
            onClick={onAdd}
            disabled={isAdding}
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors"
            style={{
              background: "rgba(95, 191, 138, 0.2)",
              border: "2px solid var(--rpg-teal)",
              color: "var(--rpg-teal)",
            }}
          >
            {isAdding ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
          </button>
        )}
      </div>

      {/* Subpills row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Type tag - solid background with contrast */}
        <span
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
          style={{
            background: typeStyle.bg,
            color: typeStyle.text,
          }}
        >
          <span>{typeStyle.icon}</span>
          <span className="capitalize">{suggestion.location.type}</span>
        </span>

        {/* City subpill */}
        {suggestion.location.city && (
          <span
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs"
            style={{
              background: "var(--rpg-darker)",
              border: "1px solid var(--rpg-border)",
              color: "var(--rpg-muted)",
            }}
          >
            <MapPin size={10} />
            {suggestion.location.city.name}
          </span>
        )}

        {/* Neighborhood subpill */}
        {suggestion.location.neighborhood && (
          <span
            className="inline-flex items-center px-2 py-1 rounded text-xs"
            style={{
              background: "var(--rpg-darker)",
              border: "1px solid var(--rpg-border)",
              color: "var(--rpg-muted)",
            }}
          >
            {suggestion.location.neighborhood.name}
          </span>
        )}

        {/* Wanted by badge */}
        <span
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs shrink-0 ml-auto"
          style={{
            background:
              suggestion.wantedCount > 1
                ? "var(--rpg-purple)"
                : "var(--rpg-teal)",
            color: "white",
          }}
          title={suggestion.wantedBy.map((u) => u.displayName || u.username).join(", ")}
        >
          <Users size={12} />
          <span>{suggestion.wantedCount} {suggestion.wantedCount === 1 ? "wants" : "want"}</span>
        </span>
      </div>

      {/* Who wants it - avatars */}
      {suggestion.wantedBy.length > 0 && (
        <div className="flex items-center gap-1 -space-x-1">
          {suggestion.wantedBy.slice(0, 5).map((user, idx) => (
            <div
              key={user.userId}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] border-2"
              style={{
                background: user.avatarUrl ? `url(${user.avatarUrl})` : "var(--rpg-border)",
                backgroundSize: "cover",
                color: "var(--rpg-text)",
                borderColor: "var(--rpg-card)",
                zIndex: suggestion.wantedBy.length - idx,
              }}
              title={user.displayName || user.username}
            >
              {!user.avatarUrl && (user.displayName || user.username)[0].toUpperCase()}
            </div>
          ))}
          {suggestion.wantedBy.length > 5 && (
            <span className="text-xs ml-2" style={{ color: "var(--rpg-muted)" }}>
              +{suggestion.wantedBy.length - 5} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}
