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
  Pencil,
  X,
  UserPlus,
  Heart,
} from "lucide-react";
import TravelApp from "../../TravelApp";
import StarRating from "@/components/ui/StarRating";

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
  hotlistedBy: Array<{
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  }>;
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
      status: string;
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

  // Edit/Delete modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    name: quest.name,
    description: quest.description || "",
    startDate: quest.startDate?.split("T")[0] || "",
    endDate: quest.endDate?.split("T")[0] || "",
    status: quest.status,
  });
  const [questData, setQuestData] = useState({
    name: quest.name,
    description: quest.description,
    status: quest.status,
    startDate: quest.startDate,
    endDate: quest.endDate,
  });

  // Rating/Review modal state
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [completingItem, setCompletingItem] = useState<QuestItem | null>(null);
  const [itemRating, setItemRating] = useState(0);
  const [itemReview, setItemReview] = useState("");

  const completedCount = items.filter((i) => i.completed).length;
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;
  const statusStyle = STATUS_COLORS[questData.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.PLANNING;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const toggleItemCompletion = async (itemId: string, completed: boolean) => {
    // If completing an item, show rating modal first
    if (completed) {
      const item = items.find((i) => i.id === itemId);
      if (item) {
        setCompletingItem(item);
        setItemRating(0);
        setItemReview("");
        setShowRatingModal(true);
        return;
      }
    }

    // If uncompleting, just update directly
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

  // Complete item with optional rating and review
  const completeItemWithRating = async (skipRating = false) => {
    if (!completingItem) return;

    setIsUpdating(completingItem.id);

    try {
      const response = await fetch(`/api/quests/${quest.id}/items/${completingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completed: true,
          rating: skipRating ? undefined : itemRating || undefined,
          review: skipRating ? undefined : itemReview || undefined,
        }),
      });

      if (response.ok) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === completingItem.id
              ? {
                  ...item,
                  completed: true,
                  completedAt: new Date().toISOString(),
                  completedBy: { id: userId, username: "", displayName: null, avatarUrl: null },
                }
              : item
          )
        );
      }
    } catch (error) {
      console.error("Failed to complete item:", error);
    } finally {
      setIsUpdating(null);
      setShowRatingModal(false);
      setShowReviewModal(false);
      setCompletingItem(null);
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

  const handleEditSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/quests/${quest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          name: editForm.name,
          description: editForm.description || null,
          startDate: editForm.startDate || null,
          endDate: editForm.endDate || null,
          status: editForm.status,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setQuestData({
          name: data.quest.name,
          description: data.quest.description,
          status: data.quest.status,
          startDate: data.quest.startDate,
          endDate: data.quest.endDate,
        });
        setShowEditModal(false);
      }
    } catch (error) {
      console.error("Failed to update quest:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/quests/${quest.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/travel/quests");
      }
    } catch (error) {
      console.error("Failed to delete quest:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TravelApp isLoggedIn={true}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Action Bar - Back + Edit/Delete aligned */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/travel/quests"
            className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--rpg-muted)" }}
          >
            <ArrowLeft size={20} />
          </Link>

          {/* Edit/Delete buttons (owner only) */}
          {quest.isOwner && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditForm({
                    name: questData.name,
                    description: questData.description || "",
                    startDate: questData.startDate?.split("T")[0] || "",
                    endDate: questData.endDate?.split("T")[0] || "",
                    status: questData.status,
                  });
                  setShowEditModal(true);
                }}
                className="p-2 rounded-lg transition-colors hover:bg-white/10"
                style={{ color: "var(--rpg-muted)" }}
                title="Edit quest"
              >
                <Pencil size={18} />
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="p-2 rounded-lg transition-colors hover:bg-red-500/10"
                style={{ color: "var(--rpg-muted)" }}
                title="Delete quest"
              >
                <Trash2 size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Quest Title Card */}
        <div
          className="rounded-lg p-5 mb-6"
          style={{
            background: "var(--rpg-card)",
            border: "2px solid var(--rpg-border)",
          }}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <h1
              className="text-xl md:text-2xl flex-1"
              style={{ color: "var(--rpg-text)", textShadow: "0 0 10px rgba(255, 255, 255, 0.3)" }}
            >
              {questData.name}
            </h1>
            <span
              className="text-xs px-2 py-1 rounded shrink-0"
              style={{ background: statusStyle.bg, color: statusStyle.text }}
            >
              {statusStyle.label}
            </span>
          </div>

          {/* Description */}
          {questData.description && (
            <p className="text-sm mb-3" style={{ color: "var(--rpg-muted)" }}>
              {questData.description}
            </p>
          )}

          {/* Cities */}
          <div className="flex items-center gap-1 text-sm mb-2" style={{ color: "var(--rpg-muted)" }}>
            <MapPin size={14} />
            <span>{quest.cities.map((c) => c.name).join(", ")}</span>
          </div>

          {/* Dates */}
          {(questData.startDate || questData.endDate) && (
            <div className="flex items-center gap-1 text-sm" style={{ color: "var(--rpg-muted)" }}>
              <Calendar size={14} />
              <span>
                {questData.startDate && questData.endDate
                  ? `${formatDate(questData.startDate)} - ${formatDate(questData.endDate)}`
                  : questData.startDate
                  ? `From ${formatDate(questData.startDate)}`
                  : `Until ${formatDate(questData.endDate)}`}
              </span>
            </div>
          )}
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

        {/* Party Section */}
        <div
          className="rounded-lg p-5 mb-6"
          style={{
            background: "var(--rpg-card)",
            border: "2px solid var(--rpg-border)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users size={16} style={{ color: "var(--rpg-purple)" }} />
              <span className="text-sm font-medium" style={{ color: "var(--rpg-text)" }}>
                Quest Party
              </span>
              {quest.party && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(168, 85, 247, 0.2)",
                    color: "var(--rpg-purple)",
                  }}
                >
                  {quest.party.memberCount} {quest.party.memberCount === 1 ? "member" : "members"}
                </span>
              )}
            </div>
            {quest.isOwner && (
              <Link
                href={`/friends?invite_to_quest=${quest.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
                style={{
                  background: "rgba(168, 85, 247, 0.15)",
                  color: "var(--rpg-purple)",
                  border: "1px solid rgba(168, 85, 247, 0.3)",
                }}
              >
                <UserPlus size={14} />
                <span>Add to Party</span>
              </Link>
            )}
          </div>

          {quest.party && quest.party.members.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {quest.party.members.map((member) => {
                const isPending = member.status === "PENDING";
                return (
                  <Link
                    key={member.id}
                    href={`/users/${member.id}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-white/5"
                    style={{
                      background: "var(--rpg-bg)",
                      border: isPending ? "1px dashed var(--rpg-border)" : "1px solid var(--rpg-border)",
                      opacity: isPending ? 0.6 : 1,
                    }}
                  >
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.displayName || member.username}
                        className="w-7 h-7 rounded-full"
                        style={{
                          border: isPending ? "2px solid var(--rpg-border)" : "2px solid var(--rpg-purple)",
                          filter: isPending ? "grayscale(50%)" : "none",
                        }}
                      />
                    ) : (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
                        style={{
                          background: isPending ? "var(--rpg-border)" : "var(--rpg-purple)",
                          border: "2px solid var(--rpg-card)",
                          color: "white",
                        }}
                      >
                        {(member.displayName || member.username).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm" style={{ color: isPending ? "var(--rpg-muted)" : "var(--rpg-text)" }}>
                      {member.displayName || member.username}
                    </span>
                    {isPending && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{
                          background: "rgba(107, 114, 128, 0.2)",
                          color: "var(--rpg-muted)",
                        }}
                      >
                        Pending
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--rpg-muted)" }}>
              No party members yet. Invite friends to join this quest!
            </p>
          )}
        </div>

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
                    {/* Full location hierarchy: Country > City > Neighborhood */}
                    <p className="text-xs truncate" style={{ color: "var(--rpg-muted)" }}>
                      {[
                        item.location.city?.country,
                        item.location.city?.name,
                        item.location.neighborhood?.name,
                      ]
                        .filter(Boolean)
                        .join(" > ")}
                    </p>
                    {/* Hotlisted by / Added by / Completed by badges */}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {item.hotlistedBy.length > 0 && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-1"
                          style={{
                            background: "rgba(255, 107, 107, 0.15)",
                            color: "#ff6b6b",
                          }}
                          title={item.hotlistedBy.map((u) => u.displayName || u.username).join(", ")}
                        >
                          <Heart size={10} style={{ fill: "#ff6b6b" }} />
                          {item.hotlistedBy.length === 1
                            ? item.hotlistedBy[0].displayName || item.hotlistedBy[0].username
                            : `${item.hotlistedBy.length} hotlisted`}
                        </span>
                      )}
                      {item.addedBy && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{
                            background: "rgba(99, 102, 241, 0.15)",
                            color: "var(--rpg-purple)",
                          }}
                        >
                          Added by {item.addedBy.displayName || item.addedBy.username}
                        </span>
                      )}
                      {item.completed && item.completedBy && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{
                            background: "rgba(95, 191, 138, 0.15)",
                            color: "var(--rpg-teal)",
                          }}
                        >
                          Completed by {item.completedBy.displayName || item.completedBy.username}
                        </span>
                      )}
                    </div>
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

        {/* Edit Modal */}
        {showEditModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0, 0, 0, 0.8)" }}
            onClick={() => setShowEditModal(false)}
          >
            <div
              className="w-full max-w-md rounded-xl p-6"
              style={{
                background: "var(--rpg-card)",
                border: "2px solid var(--rpg-border)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium" style={{ color: "var(--rpg-text)" }}>
                  Edit Quest
                </h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1"
                  style={{ color: "var(--rpg-muted)" }}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-1" style={{ color: "var(--rpg-muted)" }}>
                    Quest Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      background: "var(--rpg-bg)",
                      border: "1px solid var(--rpg-border)",
                      color: "var(--rpg-text)",
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1" style={{ color: "var(--rpg-muted)" }}>
                    Description
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                    style={{
                      background: "var(--rpg-bg)",
                      border: "1px solid var(--rpg-border)",
                      color: "var(--rpg-text)",
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1" style={{ color: "var(--rpg-muted)" }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={editForm.startDate}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        background: "var(--rpg-bg)",
                        border: "1px solid var(--rpg-border)",
                        color: "var(--rpg-text)",
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: "var(--rpg-muted)" }}>
                      End Date
                    </label>
                    <input
                      type="date"
                      value={editForm.endDate}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        background: "var(--rpg-bg)",
                        border: "1px solid var(--rpg-border)",
                        color: "var(--rpg-text)",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-1" style={{ color: "var(--rpg-muted)" }}>
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      background: "var(--rpg-bg)",
                      border: "1px solid var(--rpg-border)",
                      color: "var(--rpg-text)",
                    }}
                  >
                    <option value="PLANNING">Planning</option>
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-lg text-sm"
                  style={{ color: "var(--rpg-muted)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSubmit}
                  disabled={isSubmitting || !editForm.name.trim()}
                  className="px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                  style={{
                    background: "var(--rpg-teal)",
                    color: "white",
                  }}
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0, 0, 0, 0.8)" }}
            onClick={() => setShowDeleteModal(false)}
          >
            <div
              className="w-full max-w-sm rounded-xl p-6 text-center"
              style={{
                background: "var(--rpg-card)",
                border: "2px solid var(--rpg-border)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: "rgba(239, 68, 68, 0.15)" }}
              >
                <Trash2 size={28} color="#ef4444" />
              </div>

              <h2 className="text-lg font-medium mb-2" style={{ color: "var(--rpg-text)" }}>
                Delete Quest?
              </h2>
              <p className="text-sm mb-6" style={{ color: "var(--rpg-muted)" }}>
                This will permanently delete &quot;{questData.name}&quot; and all its items.
                This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm"
                  style={{
                    background: "var(--rpg-bg)",
                    border: "1px solid var(--rpg-border)",
                    color: "var(--rpg-text)",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                  style={{
                    background: "#ef4444",
                    color: "white",
                  }}
                >
                  {isSubmitting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rating Modal - Shown when completing an item */}
        {showRatingModal && completingItem && (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4"
            style={{ background: "rgba(0, 0, 0, 0.85)" }}
            onClick={() => {
              setShowRatingModal(false);
              setCompletingItem(null);
            }}
          >
            <div
              className="w-full max-w-md rounded-xl p-6"
              style={{
                background: "var(--rpg-card)",
                border: "2px solid var(--rpg-border)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Location icon and name */}
              <div className="text-center mb-6">
                <div
                  className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl"
                  style={{
                    background: "rgba(95, 191, 138, 0.15)",
                    border: "2px solid var(--rpg-teal)",
                  }}
                >
                  {LOCATION_TYPE_ICONS[completingItem.location.type] || "📍"}
                </div>
                <h2 className="text-lg font-medium" style={{ color: "var(--rpg-text)" }}>
                  Rate {completingItem.location.name}
                </h2>
                <p className="text-xs mt-1" style={{ color: "var(--rpg-muted)" }}>
                  {[
                    completingItem.location.city?.country,
                    completingItem.location.city?.name,
                    completingItem.location.neighborhood?.name,
                  ]
                    .filter(Boolean)
                    .join(" > ")}
                </p>
              </div>

              {/* Star Rating */}
              <div className="flex justify-center mb-6">
                <StarRating
                  value={itemRating}
                  onChange={setItemRating}
                  size="lg"
                  showClear={false}
                />
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="w-full px-4 py-3 rounded-lg text-sm transition-colors"
                  style={{
                    background: "var(--rpg-bg)",
                    border: "1px solid var(--rpg-border)",
                    color: "var(--rpg-text)",
                  }}
                >
                  Add Review
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => completeItemWithRating(true)}
                    disabled={isUpdating === completingItem.id}
                    className="flex-1 px-4 py-3 rounded-lg text-sm"
                    style={{ color: "var(--rpg-muted)" }}
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => completeItemWithRating(false)}
                    disabled={isUpdating === completingItem.id}
                    className="flex-1 px-4 py-3 rounded-lg text-sm disabled:opacity-50"
                    style={{
                      background: "var(--rpg-teal)",
                      color: "white",
                    }}
                  >
                    {isUpdating === completingItem.id ? "Saving..." : "Complete"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Review Modal - Shown when user clicks "Add Review" */}
        {showReviewModal && completingItem && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center p-4"
            style={{ background: "rgba(0, 0, 0, 0.85)" }}
            onClick={() => setShowReviewModal(false)}
          >
            <div
              className="w-full max-w-md rounded-xl p-6"
              style={{
                background: "var(--rpg-card)",
                border: "2px solid var(--rpg-border)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium" style={{ color: "var(--rpg-text)" }}>
                  Write a Review
                </h2>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="p-1"
                  style={{ color: "var(--rpg-muted)" }}
                >
                  <X size={20} />
                </button>
              </div>

              <p className="text-sm mb-4" style={{ color: "var(--rpg-muted)" }}>
                Share your experience at {completingItem.location.name}
              </p>

              <textarea
                value={itemReview}
                onChange={(e) => setItemReview(e.target.value)}
                placeholder="Write your review..."
                rows={4}
                className="w-full px-3 py-2 rounded-lg text-sm resize-none mb-4"
                style={{
                  background: "var(--rpg-bg)",
                  border: "1px solid var(--rpg-border)",
                  color: "var(--rpg-text)",
                }}
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm"
                  style={{ color: "var(--rpg-muted)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm"
                  style={{
                    background: "var(--rpg-teal)",
                    color: "white",
                  }}
                >
                  Save Review
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TravelApp>
  );
}
