"use client";

import { useState, useEffect } from "react";
import { Heart, Check, Star, Compass, X, ChevronRight } from "lucide-react";
import {
  toggleHotlist,
  markAsVisited,
  unmarkAsVisited,
  rateLocation,
} from "@/app/actions/location-actions";
import StarRating from "@/components/ui/StarRating";

interface Quest {
  id: string;
  name: string;
  status: string;
  itemCount: number;
}

interface Props {
  locationId: string;
  isHotlist: boolean;
  isVisited: boolean;
  personalRating: number | null;
}

export default function LocationActions({
  locationId,
  isHotlist: initialHotlist,
  isVisited: initialVisited,
  personalRating: initialRating,
}: Props) {
  const [isHotlist, setIsHotlist] = useState(initialHotlist);
  const [isVisited, setIsVisited] = useState(initialVisited);
  const [rating, setRating] = useState(initialRating);
  const [loading, setLoading] = useState<string | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [showQuestModal, setShowQuestModal] = useState(false);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [questsLoading, setQuestsLoading] = useState(false);
  const [addedToQuest, setAddedToQuest] = useState<string | null>(null);

  const handleToggleHotlist = async () => {
    setLoading("hotlist");
    try {
      await toggleHotlist(locationId);
      setIsHotlist(!isHotlist);
    } catch (error) {
      console.error("Failed to toggle hotlist:", error);
    } finally {
      setLoading(null);
    }
  };

  const handleToggleVisited = async () => {
    setLoading("visited");
    try {
      if (isVisited) {
        await unmarkAsVisited(locationId);
      } else {
        await markAsVisited(locationId);
      }
      setIsVisited(!isVisited);
    } catch (error) {
      console.error("Failed to toggle visited:", error);
    } finally {
      setLoading(null);
    }
  };

  const handleRate = async (newRating: number) => {
    setLoading("rating");
    try {
      await rateLocation(locationId, newRating);
      setRating(newRating);
      setShowRating(false);
    } catch (error) {
      console.error("Failed to rate:", error);
    } finally {
      setLoading(null);
    }
  };

  const fetchQuests = async () => {
    setQuestsLoading(true);
    try {
      // Fetch all quests and filter for active ones client-side
      const res = await fetch("/api/quests?limit=50");
      if (res.ok) {
        const data = await res.json();
        // Filter for PLANNING and ACTIVE quests
        const activeQuests = (data.quests || [])
          .filter((q: { status: string }) => q.status === "PLANNING" || q.status === "ACTIVE")
          .map((q: { id: string; name: string; status: string; completionStats: { total: number } }) => ({
            id: q.id,
            name: q.name,
            status: q.status,
            itemCount: q.completionStats?.total || 0,
          }));
        setQuests(activeQuests);
      }
    } catch (error) {
      console.error("Failed to fetch quests:", error);
    } finally {
      setQuestsLoading(false);
    }
  };

  const handleOpenQuestModal = () => {
    setShowQuestModal(true);
    fetchQuests();
  };

  const handleAddToQuest = async (questId: string) => {
    setLoading("quest");
    try {
      const res = await fetch(`/api/quests/${questId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId }),
      });
      if (res.ok) {
        const quest = quests.find((q) => q.id === questId);
        setAddedToQuest(quest?.name || "quest");
        setShowQuestModal(false);
        setTimeout(() => setAddedToQuest(null), 3000);
      } else {
        const data = await res.json();
        if (data.error === "Location is already in this quest") {
          alert("This location is already in that quest.");
        }
      }
    } catch (error) {
      console.error("Failed to add to quest:", error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div
      className="rounded-lg p-5"
      style={{
        background: "var(--rpg-card)",
        border: "2px solid var(--rpg-border)",
        boxShadow: "0 4px 0 rgba(0, 0, 0, 0.3)",
      }}
    >
      <h3 className="text-base font-medium mb-4" style={{ color: "var(--rpg-text)" }}>
        Actions
      </h3>

      <div className="flex flex-wrap gap-3">
        {/* Hotlist Button */}
        <button
          onClick={handleToggleHotlist}
          disabled={loading === "hotlist"}
          className="flex items-center gap-2 px-4 py-2 rounded transition-all disabled:opacity-50"
          style={{
            background: isHotlist
              ? "rgba(239, 68, 68, 0.2)"
              : "rgba(0, 0, 0, 0.3)",
            border: `2px solid ${isHotlist ? "#ef4444" : "var(--rpg-border)"}`,
            color: isHotlist ? "#ef4444" : "var(--rpg-muted)",
          }}
        >
          <Heart
            className="w-4 h-4"
            fill={isHotlist ? "currentColor" : "none"}
          />
          <span className="text-sm">
            {isHotlist ? "On Hotlist" : "Add to Hotlist"}
          </span>
        </button>

        {/* Visited Button */}
        <button
          onClick={handleToggleVisited}
          disabled={loading === "visited"}
          className="flex items-center gap-2 px-4 py-2 rounded transition-all disabled:opacity-50"
          style={{
            background: isVisited
              ? "rgba(95, 191, 138, 0.2)"
              : "rgba(0, 0, 0, 0.3)",
            border: `2px solid ${
              isVisited ? "var(--rpg-teal)" : "var(--rpg-border)"
            }`,
            color: isVisited ? "var(--rpg-teal)" : "var(--rpg-muted)",
          }}
        >
          <Check className="w-4 h-4" />
          <span className="text-sm">
            {isVisited ? "Visited" : "Mark as Visited"}
          </span>
        </button>

        {/* Rate Button */}
        <button
          onClick={() => setShowRating(!showRating)}
          className="flex items-center gap-2 px-4 py-2 rounded transition-all"
          style={{
            background: rating
              ? "rgba(255, 215, 0, 0.2)"
              : "rgba(0, 0, 0, 0.3)",
            border: `2px solid ${
              rating ? "var(--rpg-gold)" : "var(--rpg-border)"
            }`,
            color: rating ? "var(--rpg-gold)" : "var(--rpg-muted)",
          }}
        >
          <Star className="w-4 h-4" fill={rating ? "currentColor" : "none"} />
          <span className="text-sm">
            {rating ? `${rating.toFixed(1)} ★` : "Rate"}
          </span>
        </button>

        {/* Add to Quest Button */}
        <button
          onClick={handleOpenQuestModal}
          disabled={loading === "quest"}
          className="flex items-center gap-2 px-4 py-2 rounded transition-all disabled:opacity-50"
          style={{
            background: addedToQuest
              ? "rgba(168, 85, 247, 0.2)"
              : "rgba(0, 0, 0, 0.3)",
            border: `2px solid ${
              addedToQuest ? "var(--rpg-purple)" : "var(--rpg-border)"
            }`,
            color: addedToQuest ? "var(--rpg-purple)" : "var(--rpg-muted)",
          }}
        >
          <Compass className="w-4 h-4" />
          <span className="text-sm">
            {addedToQuest ? `Added to ${addedToQuest}` : "Add to Quest"}
          </span>
        </button>
      </div>

      {/* Rating Selector */}
      {showRating && (
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--rpg-border)" }}>
          <p className="text-sm mb-3" style={{ color: "var(--rpg-muted)" }}>
            Select your rating:
          </p>
          <StarRating
            value={rating || 0}
            onChange={handleRate}
            disabled={loading === "rating"}
          />
        </div>
      )}

      {/* Quest Selector Modal */}
      {showQuestModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0, 0, 0, 0.8)" }}
          onClick={() => setShowQuestModal(false)}
        >
          <div
            className="w-full max-w-md rounded-lg p-5"
            style={{
              background: "var(--rpg-card)",
              border: "2px solid var(--rpg-border)",
              boxShadow: "0 8px 0 rgba(0, 0, 0, 0.4)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-lg font-medium"
                style={{ color: "var(--rpg-text)" }}
              >
                Add to Quest
              </h3>
              <button
                onClick={() => setShowQuestModal(false)}
                className="p-1 rounded"
                style={{ color: "var(--rpg-muted)" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {questsLoading ? (
              <p className="text-sm py-4 text-center" style={{ color: "var(--rpg-muted)" }}>
                Loading quests...
              </p>
            ) : quests.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-sm mb-3" style={{ color: "var(--rpg-muted)" }}>
                  No active quests found.
                </p>
                <a
                  href="/travel/quests/new"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded text-sm"
                  style={{
                    background: "rgba(168, 85, 247, 0.2)",
                    border: "2px solid var(--rpg-purple)",
                    color: "var(--rpg-purple)",
                  }}
                >
                  <Compass className="w-4 h-4" />
                  Create a Quest
                </a>
              </div>
            ) : (
              <div className="space-y-2">
                {quests.map((quest) => (
                  <button
                    key={quest.id}
                    onClick={() => handleAddToQuest(quest.id)}
                    disabled={loading === "quest"}
                    className="w-full flex items-center justify-between p-3 rounded transition-all disabled:opacity-50"
                    style={{
                      background: "rgba(0, 0, 0, 0.3)",
                      border: "2px solid var(--rpg-border)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Compass
                        className="w-5 h-5"
                        style={{ color: "var(--rpg-purple)" }}
                      />
                      <div className="text-left">
                        <p
                          className="text-sm font-medium"
                          style={{ color: "var(--rpg-text)" }}
                        >
                          {quest.name}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: "var(--rpg-muted)" }}
                        >
                          {quest.itemCount} locations
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      className="w-4 h-4"
                      style={{ color: "var(--rpg-muted)" }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
