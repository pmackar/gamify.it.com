"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Users, Check, Loader2, Search, X, MapPin, Heart, Globe, Building2, Sparkles } from "lucide-react";
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
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingLocation, setAddingLocation] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimeout = useRef<NodeJS.Timeout>();

  // Scope state
  const [scope, setScope] = useState<ScopeType>("all");
  const [questCities, setQuestCities] = useState<Array<{ id: string; name: string; country: string }>>([]);
  const [questNeighborhoods, setQuestNeighborhoods] = useState<Array<{ id: string; name: string }>>([]);

  // Debounce search input
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [searchQuery]);

  const fetchSuggestions = useCallback(async (fetchScope: ScopeType, search: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ scope: fetchScope });
      if (search.trim()) {
        params.set("search", search.trim());
      }
      const response = await fetch(`/api/quests/${questId}/suggestions?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch suggestions");
      }
      const data = await response.json();
      setSuggestions(data.suggestions || []);
      setQuestCities(data.questCities || []);
      setQuestNeighborhoods(data.questNeighborhoods || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [questId]);

  // Initial load and when search/scope changes
  useEffect(() => {
    fetchSuggestions(scope, debouncedSearch);
  }, [questId, scope, debouncedSearch, fetchSuggestions]);

  // Focus search on mount
  useEffect(() => {
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, []);

  const handleScopeChange = (newScope: ScopeType) => {
    setScope(newScope);
  };

  // Split suggestions into available and already in quest
  const { notInQuestSuggestions, inQuestSuggestions } = useMemo(() => {
    return {
      notInQuestSuggestions: suggestions.filter((s) => !s.isInQuest),
      inQuestSuggestions: suggestions.filter((s) => s.isInQuest),
    };
  }, [suggestions]);

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

  return (
    <TravelApp isLoggedIn={true}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <Link
            href={`/travel/quests/${questId}`}
            className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--rpg-muted)" }}
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1
              className="text-xl md:text-2xl"
              style={{ color: "var(--rpg-text)" }}
            >
              Add Location
            </h1>
          </div>
        </div>

        {/* Search Bar - Primary */}
        <div
          className="rounded-xl p-4 mb-4"
          style={{
            background: "var(--rpg-card)",
            border: "2px solid var(--rpg-border)",
          }}
        >
          <div className="relative">
            <Search
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2"
              style={{ color: "var(--rpg-muted)" }}
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a location..."
              className="w-full pl-12 pr-12 py-4 rounded-xl text-base"
              style={{
                background: "var(--rpg-darker)",
                border: "2px solid var(--rpg-border)",
                color: "var(--rpg-text)",
                outline: "none",
              }}
              onFocus={(e) => {
                (e.target as HTMLInputElement).style.borderColor = "var(--rpg-teal)";
              }}
              onBlur={(e) => {
                (e.target as HTMLInputElement).style.borderColor = "var(--rpg-border)";
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1"
                style={{ color: "var(--rpg-muted)" }}
              >
                <X size={18} />
              </button>
            )}
            {loading && (
              <Loader2
                size={18}
                className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin"
                style={{ color: "var(--rpg-teal)" }}
              />
            )}
          </div>

          {/* Scope filters */}
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => handleScopeChange("all")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{
                background: scope === "all" ? "rgba(255, 215, 0, 0.2)" : "transparent",
                border: scope === "all" ? "1px solid var(--rpg-gold)" : "1px solid var(--rpg-border)",
                color: scope === "all" ? "var(--rpg-gold)" : "var(--rpg-muted)",
              }}
            >
              <Globe size={12} />
              All
            </button>
            <button
              onClick={() => handleScopeChange("hotlist")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{
                background: scope === "hotlist" ? "rgba(255, 107, 107, 0.2)" : "transparent",
                border: scope === "hotlist" ? "1px solid #ff6b6b" : "1px solid var(--rpg-border)",
                color: scope === "hotlist" ? "#ff6b6b" : "var(--rpg-muted)",
              }}
            >
              <Heart size={12} style={{ fill: scope === "hotlist" ? "#ff6b6b" : "none" }} />
              Hotlist
            </button>
            {questNeighborhoods.length > 0 && (
              <button
                onClick={() => handleScopeChange("neighborhood")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  background: scope === "neighborhood" ? "rgba(95, 191, 138, 0.2)" : "transparent",
                  border: scope === "neighborhood" ? "1px solid var(--rpg-teal)" : "1px solid var(--rpg-border)",
                  color: scope === "neighborhood" ? "var(--rpg-teal)" : "var(--rpg-muted)",
                }}
              >
                <MapPin size={12} />
                {questNeighborhoods.length === 1 ? questNeighborhoods[0].name : "Neighborhoods"}
              </button>
            )}
            {questCities.length > 0 && (
              <button
                onClick={() => handleScopeChange("city")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  background: scope === "city" ? "rgba(99, 102, 241, 0.2)" : "transparent",
                  border: scope === "city" ? "1px solid var(--rpg-purple)" : "1px solid var(--rpg-border)",
                  color: scope === "city" ? "var(--rpg-purple)" : "var(--rpg-muted)",
                }}
              >
                <Building2 size={12} />
                {questCities.length === 1 ? questCities[0].name : "Cities"}
              </button>
            )}
          </div>
        </div>

        {error ? (
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
        ) : initialLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin" style={{ color: "var(--rpg-teal)" }} />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Results */}
            {notInQuestSuggestions.length > 0 && (
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
            )}

            {/* Already in quest */}
            {inQuestSuggestions.length > 0 && (
              <div className="space-y-2 opacity-50">
                <p className="text-xs px-2" style={{ color: "var(--rpg-muted)" }}>
                  Already in quest:
                </p>
                {inQuestSuggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.location.id}
                    suggestion={suggestion}
                    isInQuest
                  />
                ))}
              </div>
            )}

            {/* No results message */}
            {suggestions.length === 0 && searchQuery && (
              <div
                className="text-center py-8 rounded-lg"
                style={{
                  background: "var(--rpg-card)",
                  border: "2px solid var(--rpg-border)",
                }}
              >
                <Search size={32} className="mx-auto mb-3" style={{ color: "var(--rpg-muted)" }} />
                <p className="mb-2" style={{ color: "var(--rpg-text)" }}>
                  No locations found for "{searchQuery}"
                </p>
                <p className="text-sm mb-4" style={{ color: "var(--rpg-muted)" }}>
                  Can't find what you're looking for?
                </p>
              </div>
            )}

            {/* Add New Location - Always show at bottom */}
            <Link
              href={`/travel/locations/new?addToQuest=${questId}${searchQuery ? `&name=${encodeURIComponent(searchQuery)}` : ""}`}
              className="flex items-center gap-3 p-4 rounded-lg transition-all hover:scale-[1.01]"
              style={{
                background: "rgba(95, 191, 138, 0.1)",
                border: "2px dashed var(--rpg-teal)",
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(95, 191, 138, 0.2)",
                  border: "2px solid var(--rpg-teal)",
                }}
              >
                <Plus size={20} style={{ color: "var(--rpg-teal)" }} />
              </div>
              <div className="flex-1">
                <span className="text-base font-medium block" style={{ color: "var(--rpg-teal)" }}>
                  {searchQuery ? `Add "${searchQuery}" as new location` : "Add New Location"}
                </span>
                <span className="text-xs flex items-center gap-1" style={{ color: "var(--rpg-muted)" }}>
                  <Sparkles size={12} style={{ color: "var(--rpg-gold)" }} />
                  +15 XP
                </span>
              </div>
            </Link>
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
