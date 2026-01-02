"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  Check,
  Circle,
  Trash2,
  MoreVertical,
  Lightbulb,
} from "lucide-react";
import TravelApp from "../../TravelApp";

interface QuestItem {
  id: string;
  completed: boolean;
  completedAt: string | null;
  sortOrder: number;
  location: {
    id: string;
    name: string;
    type: string;
    address: string | null;
    city: { name: string; country: string } | null;
    neighborhood: { name: string } | null;
  };
  addedBy: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
  completedBy: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
}

interface Quest {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  isOwner: boolean;
  cities: Array<{ id: string; name: string; country: string }>;
  neighborhoods: Array<{ id: string; name: string }>;
  items: QuestItem[];
  party: {
    id: string;
    memberCount: number;
    members: Array<{
      id: string;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
    }>;
  } | null;
}

interface QuestDetailClientProps {
  quest: Quest;
  userId: string;
}

const STATUS_COLORS = {
  PLANNING: { bg: "rgba(99, 102, 241, 0.2)", text: "var(--rpg-purple)", label: "Planning" },
  ACTIVE: { bg: "rgba(95, 191, 138, 0.2)", text: "var(--rpg-teal)", label: "Active" },
  COMPLETED: { bg: "rgba(255, 215, 0, 0.2)", text: "var(--rpg-gold)", label: "Completed" },
  ARCHIVED: { bg: "rgba(107, 114, 128, 0.2)", text: "var(--rpg-muted)", label: "Archived" },
};

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

export default function QuestDetailClient({ quest, userId }: QuestDetailClientProps) {
  const router = useRouter();
  const [items, setItems] = useState<QuestItem[]>(quest.items);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const completedCount = items.filter((i) => i.completed).length;
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;
  const statusStyle = STATUS_COLORS[quest.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.PLANNING;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const toggleItemCompletion = async (itemId: string, completed: boolean) => {
    setIsUpdating(itemId);

    try {
      const response = await fetch(`/api/quests/${quest.id}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });

      if (response.ok) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  completed,
                  completedAt: completed ? new Date().toISOString() : null,
                  completedBy: completed
                    ? { id: userId, username: "", displayName: null, avatarUrl: null }
                    : null,
                }
              : item
          )
        );
      }
    } catch (error) {
      console.error("Failed to update item:", error);
    } finally {
      setIsUpdating(null);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!confirm("Remove this location from the quest?")) return;

    setIsUpdating(itemId);

    try {
      const response = await fetch(`/api/quests/${quest.id}/items/${itemId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setItems((prev) => prev.filter((item) => item.id !== itemId));
      }
    } catch (error) {
      console.error("Failed to remove item:", error);
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <TravelApp isLoggedIn={true}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <Link
            href="/travel/quests"
            className="p-2 rounded-lg transition-colors mt-1"
            style={{ color: "var(--rpg-muted)" }}
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1
                className="text-xl md:text-2xl"
                style={{ color: "var(--rpg-text)", textShadow: "0 0 10px rgba(255, 255, 255, 0.3)" }}
              >
                {quest.name}
              </h1>
              <span
                className="text-xs px-2 py-1 rounded"
                style={{ background: statusStyle.bg, color: statusStyle.text }}
              >
                {statusStyle.label}
              </span>
            </div>

            {/* Cities */}
            <div className="flex items-center gap-1 text-sm mb-2" style={{ color: "var(--rpg-muted)" }}>
              <MapPin size={14} />
              <span>{quest.cities.map((c) => c.name).join(", ")}</span>
            </div>

            {/* Dates */}
            {(quest.startDate || quest.endDate) && (
              <div className="flex items-center gap-1 text-sm" style={{ color: "var(--rpg-muted)" }}>
                <Calendar size={14} />
                <span>
                  {quest.startDate && quest.endDate
                    ? `${formatDate(quest.startDate)} - ${formatDate(quest.endDate)}`
                    : quest.startDate
                    ? `From ${formatDate(quest.startDate)}`
                    : `Until ${formatDate(quest.endDate)}`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Card */}
        <div
          className="rounded-lg p-5 mb-6"
          style={{
            background: "var(--rpg-card)",
            border: "2px solid var(--rpg-border)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm" style={{ color: "var(--rpg-muted)" }}>
              Progress
            </span>
            <span className="text-sm font-medium" style={{ color: "var(--rpg-text)" }}>
              {completedCount} / {items.length} completed
            </span>
          </div>
          <div
            className="h-3 rounded-full overflow-hidden"
            style={{ background: "var(--rpg-border)" }}
          >
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                background: progress === 100 ? "var(--rpg-gold)" : "var(--rpg-teal)",
              }}
            />
          </div>
        </div>

        {/* Party (if exists) */}
        {quest.party && (
          <div
            className="rounded-lg p-5 mb-6"
            style={{
              background: "var(--rpg-card)",
              border: "2px solid var(--rpg-border)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Users size={16} style={{ color: "var(--rpg-purple)" }} />
              <span className="text-sm font-medium" style={{ color: "var(--rpg-text)" }}>
                Party ({quest.party.memberCount} members)
              </span>
            </div>
            <div className="flex -space-x-2">
              {quest.party.members.map((member) => (
                <div
                  key={member.id}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                  style={{
                    background: "var(--rpg-purple)",
                    border: "2px solid var(--rpg-card)",
                    color: "white",
                  }}
                  title={member.displayName || member.username}
                >
                  {(member.displayName || member.username).charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions hint */}
        <Link
          href={`/travel/quests/${quest.id}/suggestions`}
          className="flex items-center gap-3 rounded-lg p-4 mb-6 transition-all hover:scale-[1.01]"
          style={{
            background: "rgba(255, 215, 0, 0.1)",
            border: "2px solid rgba(255, 215, 0, 0.3)",
          }}
        >
          <Lightbulb size={20} style={{ color: "var(--rpg-gold)" }} />
          <div className="flex-1">
            <span className="text-sm font-medium" style={{ color: "var(--rpg-gold)" }}>
              View Suggestions
            </span>
            <p className="text-xs" style={{ color: "var(--rpg-muted)" }}>
              See hotlisted locations from you and your party
            </p>
          </div>
        </Link>

        {/* Items List */}
        <div
          className="rounded-lg overflow-hidden"
          style={{
            background: "var(--rpg-card)",
            border: "2px solid var(--rpg-border)",
          }}
        >
          <div className="p-4 border-b" style={{ borderColor: "var(--rpg-border)" }}>
            <h2 className="text-base font-medium" style={{ color: "var(--rpg-text)" }}>
              Locations ({items.length})
            </h2>
          </div>

          {items.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm mb-2" style={{ color: "var(--rpg-muted)" }}>
                No locations added yet
              </p>
              <p className="text-xs" style={{ color: "var(--rpg-muted)" }}>
                Add locations from your hotlist or search for new ones
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--rpg-border)" }}>
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-4 transition-colors"
                  style={{
                    opacity: isUpdating === item.id ? 0.5 : 1,
                    background: item.completed ? "rgba(95, 191, 138, 0.05)" : "transparent",
                  }}
                >
                  {/* Completion toggle */}
                  <button
                    onClick={() => toggleItemCompletion(item.id, !item.completed)}
                    disabled={isUpdating === item.id}
                    className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                    style={{
                      background: item.completed ? "var(--rpg-teal)" : "transparent",
                      border: item.completed
                        ? "2px solid var(--rpg-teal)"
                        : "2px solid var(--rpg-border)",
                    }}
                  >
                    {item.completed && <Check size={14} color="white" />}
                  </button>

                  {/* Location info */}
                  <Link
                    href={`/travel/locations/${item.location.id}`}
                    className="flex-1 min-w-0"
                  >
                    <div className="flex items-center gap-2">
                      <span>{LOCATION_TYPE_ICONS[item.location.type] || "📍"}</span>
                      <span
                        className="text-base truncate"
                        style={{
                          color: item.completed ? "var(--rpg-muted)" : "var(--rpg-text)",
                          textDecoration: item.completed ? "line-through" : "none",
                        }}
                      >
                        {item.location.name}
                      </span>
                    </div>
                    {item.location.neighborhood && (
                      <p className="text-xs truncate" style={{ color: "var(--rpg-muted)" }}>
                        {item.location.neighborhood.name}
                      </p>
                    )}
                  </Link>

                  {/* Remove button */}
                  <button
                    onClick={() => removeItem(item.id)}
                    disabled={isUpdating === item.id}
                    className="shrink-0 p-2 rounded transition-colors hover:bg-red-500/10"
                    style={{ color: "var(--rpg-muted)" }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </TravelApp>
  );
}
