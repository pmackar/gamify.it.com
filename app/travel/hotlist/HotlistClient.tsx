"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, MapPin, Check, Star, Trash2 } from "lucide-react";
import TravelApp from "../TravelApp";

interface HotlistItem {
  id: string;
  locationId: string;
  location: {
    id: string;
    name: string;
    type: string;
    address: string | null;
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
  visited: boolean;
  rating: number | null;
  addedAt: string;
}

interface HotlistClientProps {
  items: HotlistItem[];
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

export default function HotlistClient({ items: initialItems }: HotlistClientProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<"all" | "visited" | "unvisited">("all");

  const filteredItems = items.filter((item) => {
    if (filter === "visited") return item.visited;
    if (filter === "unvisited") return !item.visited;
    return true;
  });

  // Group by city
  const groupedItems = filteredItems.reduce((acc, item) => {
    const cityKey = item.location.city?.name || "Unknown";
    if (!acc[cityKey]) {
      acc[cityKey] = {
        city: item.location.city,
        items: [],
      };
    }
    acc[cityKey].items.push(item);
    return acc;
  }, {} as Record<string, { city: HotlistItem["location"]["city"]; items: HotlistItem[] }>);

  const removeFromHotlist = async (locationId: string) => {
    try {
      const response = await fetch(`/api/locations/${locationId}/hotlist`, {
        method: "DELETE",
      });

      if (response.ok) {
        setItems((prev) => prev.filter((item) => item.locationId !== locationId));
      }
    } catch (error) {
      console.error("Failed to remove from hotlist:", error);
    }
  };

  return (
    <TravelApp isLoggedIn={true}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1
            className="text-xl md:text-2xl flex items-center gap-3"
            style={{ color: "var(--rpg-text)", textShadow: "0 0 10px rgba(255, 255, 255, 0.3)" }}
          >
            <Heart size={24} style={{ color: "#ef4444" }} fill="#ef4444" />
            Hotlist
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--rpg-muted)" }}>
            {items.length} {items.length === 1 ? "place" : "places"} saved
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(["all", "unvisited", "visited"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-2 rounded-lg text-sm transition-all"
              style={{
                background: filter === f ? "rgba(95, 191, 138, 0.2)" : "var(--rpg-card)",
                border: filter === f ? "2px solid var(--rpg-teal)" : "2px solid var(--rpg-border)",
                color: filter === f ? "var(--rpg-teal)" : "var(--rpg-text)",
              }}
            >
              {f === "all" ? "All" : f === "visited" ? "Visited" : "Want to visit"}
            </button>
          ))}
        </div>

        {filteredItems.length === 0 ? (
          <div
            className="text-center py-12 rounded-lg"
            style={{
              background: "var(--rpg-card)",
              border: "2px solid var(--rpg-border)",
            }}
          >
            <Heart size={48} className="mx-auto mb-4" style={{ color: "var(--rpg-muted)" }} />
            <h2 className="text-lg mb-2" style={{ color: "var(--rpg-text)" }}>
              {filter === "all" ? "No hotlist items yet" : `No ${filter} places`}
            </h2>
            <p className="text-sm" style={{ color: "var(--rpg-muted)" }}>
              {filter === "all"
                ? "Add locations to your hotlist to save them for later"
                : "Try a different filter"}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedItems).map(([cityName, group]) => (
              <section key={cityName}>
                <h2
                  className="text-base font-medium mb-3 flex items-center gap-2"
                  style={{ color: "var(--rpg-text)" }}
                >
                  <MapPin size={16} style={{ color: "var(--rpg-teal)" }} />
                  {cityName}
                  {group.city && (
                    <span className="text-sm font-normal" style={{ color: "var(--rpg-muted)" }}>
                      {group.city.country}
                    </span>
                  )}
                  <span
                    className="ml-auto text-xs px-2 py-0.5 rounded"
                    style={{ background: "var(--rpg-border)", color: "var(--rpg-muted)" }}
                  >
                    {group.items.length}
                  </span>
                </h2>

                <div className="space-y-2">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-4 rounded-lg transition-all"
                      style={{
                        background: "var(--rpg-card)",
                        border: "2px solid var(--rpg-border)",
                      }}
                    >
                      {/* Type icon */}
                      <span className="text-xl">
                        {LOCATION_TYPE_ICONS[item.location.type] || "📍"}
                      </span>

                      {/* Location info */}
                      <Link
                        href={`/travel/locations/${item.location.id}`}
                        className="flex-1 min-w-0"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="text-base truncate"
                            style={{ color: "var(--rpg-text)" }}
                          >
                            {item.location.name}
                          </span>
                          {item.visited && (
                            <Check
                              size={14}
                              className="shrink-0"
                              style={{ color: "var(--rpg-teal)" }}
                            />
                          )}
                        </div>
                        {item.location.neighborhood && (
                          <p className="text-xs truncate" style={{ color: "var(--rpg-muted)" }}>
                            {item.location.neighborhood.name}
                          </p>
                        )}
                      </Link>

                      {/* Rating */}
                      {item.rating && (
                        <div className="flex items-center gap-1" style={{ color: "var(--rpg-gold)" }}>
                          <Star size={14} fill="currentColor" />
                          <span className="text-sm">{item.rating}</span>
                        </div>
                      )}

                      {/* Remove button */}
                      <button
                        onClick={() => removeFromHotlist(item.locationId)}
                        className="p-2 rounded transition-colors hover:bg-red-500/10"
                        style={{ color: "var(--rpg-muted)" }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </TravelApp>
  );
}
