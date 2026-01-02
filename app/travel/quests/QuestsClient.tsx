"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Users, Plus, Calendar, CheckCircle2 } from "lucide-react";
import TravelApp from "../TravelApp";

interface Quest {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  cities: Array<{ id: string; name: string; country: string }>;
  neighborhoods: Array<{ id: string; name: string }>;
  completionStats: {
    total: number;
    completed: number;
    percentage: number;
  };
  party: {
    memberCount: number;
    members: Array<{
      id: string;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
    }>;
  } | null;
}

interface QuestsClientProps {
  quests: Quest[];
}

const STATUS_COLORS = {
  PLANNING: { bg: "rgba(99, 102, 241, 0.2)", text: "var(--rpg-purple)", label: "Planning" },
  ACTIVE: { bg: "rgba(95, 191, 138, 0.2)", text: "var(--rpg-teal)", label: "Active" },
  COMPLETED: { bg: "rgba(255, 215, 0, 0.2)", text: "var(--rpg-gold)", label: "Completed" },
  ARCHIVED: { bg: "rgba(107, 114, 128, 0.2)", text: "var(--rpg-muted)", label: "Archived" },
};

export default function QuestsClient({ quests }: QuestsClientProps) {
  const router = useRouter();

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const activeQuests = quests.filter((q) => q.status === "ACTIVE" || q.status === "PLANNING");
  const completedQuests = quests.filter((q) => q.status === "COMPLETED" || q.status === "ARCHIVED");

  return (
    <TravelApp isLoggedIn={true}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-xl md:text-2xl"
              style={{ color: "var(--rpg-text)", textShadow: "0 0 10px rgba(255, 255, 255, 0.3)" }}
            >
              My Quests
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--rpg-muted)" }}>
              {quests.length} {quests.length === 1 ? "quest" : "quests"} total
            </p>
          </div>
          <Link
            href="/travel/quests/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:scale-105"
            style={{
              background: "rgba(95, 191, 138, 0.2)",
              border: "2px solid var(--rpg-teal)",
              color: "var(--rpg-teal)",
            }}
          >
            <Plus size={18} />
            <span className="text-sm font-medium">New Quest</span>
          </Link>
        </div>

        {quests.length === 0 ? (
          <div
            className="text-center py-12 rounded-lg"
            style={{
              background: "var(--rpg-card)",
              border: "2px solid var(--rpg-border)",
            }}
          >
            <div className="text-4xl mb-4">🗺️</div>
            <h2 className="text-lg mb-2" style={{ color: "var(--rpg-text)" }}>
              No quests yet
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--rpg-muted)" }}>
              Create your first quest to start planning your next adventure!
            </p>
            <Link
              href="/travel/quests/new"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg"
              style={{
                background: "var(--rpg-teal)",
                color: "white",
              }}
            >
              <Plus size={18} />
              Create Quest
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Quests */}
            {activeQuests.length > 0 && (
              <section>
                <h2
                  className="text-base font-medium mb-4 flex items-center gap-2"
                  style={{ color: "var(--rpg-text)" }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: "var(--rpg-teal)" }}
                  />
                  Active & Planning
                </h2>
                <div className="space-y-3">
                  {activeQuests.map((quest) => (
                    <QuestCard key={quest.id} quest={quest} formatDate={formatDate} />
                  ))}
                </div>
              </section>
            )}

            {/* Completed Quests */}
            {completedQuests.length > 0 && (
              <section>
                <h2
                  className="text-base font-medium mb-4 flex items-center gap-2"
                  style={{ color: "var(--rpg-text)" }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: "var(--rpg-gold)" }}
                  />
                  Completed
                </h2>
                <div className="space-y-3">
                  {completedQuests.map((quest) => (
                    <QuestCard key={quest.id} quest={quest} formatDate={formatDate} />
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

function QuestCard({
  quest,
  formatDate,
}: {
  quest: Quest;
  formatDate: (d: string | null) => string | null;
}) {
  const statusStyle = STATUS_COLORS[quest.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.PLANNING;

  return (
    <Link
      href={`/travel/quests/${quest.id}`}
      className="block rounded-lg p-4 transition-all hover:scale-[1.01]"
      style={{
        background: "var(--rpg-card)",
        border: "2px solid var(--rpg-border)",
        boxShadow: "0 4px 0 rgba(0, 0, 0, 0.3)",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title & Status */}
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-base font-medium truncate" style={{ color: "var(--rpg-text)" }}>
              {quest.name}
            </h3>
            <span
              className="text-xs px-2 py-0.5 rounded shrink-0"
              style={{ background: statusStyle.bg, color: statusStyle.text }}
            >
              {statusStyle.label}
            </span>
          </div>

          {/* Cities */}
          <div className="flex items-center gap-1 text-sm mb-2" style={{ color: "var(--rpg-muted)" }}>
            <MapPin size={14} />
            <span className="truncate">
              {quest.cities.map((c) => c.name).join(", ") || "No cities"}
            </span>
          </div>

          {/* Dates */}
          {(quest.startDate || quest.endDate) && (
            <div className="flex items-center gap-1 text-sm mb-2" style={{ color: "var(--rpg-muted)" }}>
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

          {/* Bottom row: Progress & Party */}
          <div className="flex items-center gap-4 mt-3">
            {/* Progress */}
            <div className="flex items-center gap-2">
              <div
                className="w-24 h-2 rounded-full overflow-hidden"
                style={{ background: "var(--rpg-border)" }}
              >
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${quest.completionStats.percentage}%`,
                    background:
                      quest.completionStats.percentage === 100
                        ? "var(--rpg-gold)"
                        : "var(--rpg-teal)",
                  }}
                />
              </div>
              <span className="text-xs" style={{ color: "var(--rpg-muted)" }}>
                {quest.completionStats.completed}/{quest.completionStats.total}
              </span>
            </div>

            {/* Party members */}
            {quest.party && quest.party.memberCount > 0 && (
              <div className="flex items-center gap-1 text-sm" style={{ color: "var(--rpg-muted)" }}>
                <Users size={14} />
                <span>{quest.party.memberCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Completion indicator */}
        {quest.status === "COMPLETED" && (
          <CheckCircle2 size={24} style={{ color: "var(--rpg-gold)" }} />
        )}
      </div>
    </Link>
  );
}
