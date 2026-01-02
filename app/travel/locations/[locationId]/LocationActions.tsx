"use client";

import { useState } from "react";
import { Heart, Check, Star } from "lucide-react";
import {
  toggleHotlist,
  markAsVisited,
  unmarkAsVisited,
  rateLocation,
} from "@/app/actions/location-actions";

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

  return (
    <div
      className="rounded-lg p-5"
      style={{
        background: "var(--rpg-card)",
        border: "2px solid var(--rpg-border)",
        boxShadow: "0 4px 0 rgba(0, 0, 0, 0.3)",
      }}
    >
      <h3 className="text-[0.65rem] mb-4" style={{ color: "var(--rpg-text)" }}>
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
          <span className="text-[0.55rem]">
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
          <span className="text-[0.55rem]">
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
          <span className="text-[0.55rem]">
            {rating ? `Rated ${rating}/10` : "Rate"}
          </span>
        </button>
      </div>

      {/* Rating Selector */}
      {showRating && (
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--rpg-border)" }}>
          <p className="text-[0.5rem] mb-3" style={{ color: "var(--rpg-muted)" }}>
            Select your rating (1-10):
          </p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <button
                key={num}
                onClick={() => handleRate(num)}
                disabled={loading === "rating"}
                className="w-8 h-8 rounded transition-all disabled:opacity-50"
                style={{
                  background:
                    rating === num
                      ? "var(--rpg-gold)"
                      : "rgba(0, 0, 0, 0.3)",
                  border: `2px solid ${
                    rating === num ? "var(--rpg-gold)" : "var(--rpg-border)"
                  }`,
                  color: rating === num ? "#000" : "var(--rpg-text)",
                }}
              >
                <span className="text-[0.55rem]">{num}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
