"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Users, Check, Loader2, Lightbulb } from "lucide-react";
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

interface SuggestionsClientProps {
  questId: string;
}

const LOCATION_TYPE_ICONS: Record<string, string> = {
  restaurant: "🍽️",
  cafe: "☕",
  bar: "🍺",
  museum: "🏛️",
  park: "🌳",
  landmark: "🏰",
  shop: "🛍️",
  hotel: "🏨",
  beach: "🏖️",
  other: "📍",
};

export default function SuggestionsClient({ questId }: SuggestionsClientProps) {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingLocation, setAddingLocation] = useState<string | null>(null);

  useEffect(() => {
    fetchSuggestions();
  }, [questId]);

  const fetchSuggestions = async () => {
    try {
      const response = await fetch(`/api/quests/${questId}/suggestions`);
      if (!response.ok) {
        throw new Error("Failed to fetch suggestions");
      }
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

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

  const notInQuestSuggestions = suggestions.filter((s) => !s.isInQuest);
  const inQuestSuggestions = suggestions.filter((s) => s.isInQuest);

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
              Party Suggestions
            </h1>
            <p className="text-sm" style={{ color: "var(--rpg-muted)" }}>
              Hotlisted locations from you and your party
            </p>
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
              No suggestions yet
            </h2>
            <p className="text-sm" style={{ color: "var(--rpg-muted)" }}>
              Add locations to your hotlist in the quest cities to see them here
            </p>
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
  return (
    <div
      className="flex items-center gap-3 p-4 rounded-lg"
      style={{
        background: "var(--rpg-card)",
        border: "2px solid var(--rpg-border)",
      }}
    >
      {/* Type icon */}
      <span className="text-xl">
        {LOCATION_TYPE_ICONS[suggestion.location.type] || "📍"}
      </span>

      {/* Location info */}
      <Link href={`/travel/locations/${suggestion.location.id}`} className="flex-1 min-w-0">
        <span className="text-base truncate block" style={{ color: "var(--rpg-text)" }}>
          {suggestion.location.name}
        </span>
        {suggestion.location.neighborhood && (
          <p className="text-xs truncate" style={{ color: "var(--rpg-muted)" }}>
            {suggestion.location.neighborhood.name}
          </p>
        )}
      </Link>

      {/* Wanted by badge */}
      <div
        className="flex items-center gap-1 px-2 py-1 rounded text-xs shrink-0"
        style={{
          background:
            suggestion.wantedCount > 1
              ? "rgba(168, 85, 247, 0.2)"
              : "rgba(95, 191, 138, 0.2)",
          color: suggestion.wantedCount > 1 ? "var(--rpg-purple)" : "var(--rpg-teal)",
        }}
        title={suggestion.wantedBy.map((u) => u.displayName || u.username).join(", ")}
      >
        <Users size={12} />
        <span>{suggestion.wantedCount}</span>
      </div>

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
  );
}
