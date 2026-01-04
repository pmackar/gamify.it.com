"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import {
  Plus,
  Sparkles,
  Target,
  Trophy,
  Clock,
  Star,
  ChevronRight,
  BookOpen,
  Dumbbell,
  Map,
  GraduationCap,
  Flame,
  Rocket,
} from "lucide-react";

interface Quest {
  id: string;
  title: string;
  description: string | null;
  questType: string;
  journeyStage: string;
  status: string;
  progressPercent: number;
  targetCount: number | null;
  currentCount: number;
  countUnit: string | null;
  startDate: string | null;
  targetDate: string | null;
  xpEarned: number;
  totalXpAvailable: number;
  icon: string | null;
  storyHook: string | null;
  aiGenerated: boolean;
  milestones: {
    id: string;
    title: string;
    journeyStage: string;
    isCompleted: boolean;
    xpReward: number;
  }[];
  pendingTasks: {
    id: string;
    title: string;
    dueDate: string | null;
  }[];
  createdAt: string;
}

const QUEST_TYPE_ICONS: Record<string, any> = {
  COUNTING: BookOpen,
  COLLECTION: Map,
  ACHIEVEMENT: Trophy,
  HABIT: Flame,
  PROJECT: Rocket,
  FITNESS: Dumbbell,
  LEARNING: GraduationCap,
};

const JOURNEY_STAGE_COLORS: Record<string, string> = {
  CALLING: "#a855f7",
  THRESHOLD: "#60a5fa",
  TESTS: "#f59e0b",
  ORDEAL: "#ef4444",
  REWARD: "#22c55e",
  RETURN: "#fbbf24",
};

const JOURNEY_STAGE_LABELS: Record<string, string> = {
  CALLING: "The Calling",
  THRESHOLD: "Threshold",
  TESTS: "The Tests",
  ORDEAL: "The Ordeal",
  REWARD: "The Reward",
  RETURN: "The Return",
};

export default function QuestsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ACTIVE" | "COMPLETED" | "all">("ACTIVE");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (authLoaded && !user) {
      router.push("/life");
    }
  }, [authLoaded, user, router]);

  useEffect(() => {
    if (user) {
      fetchQuests();
    }
  }, [user, filter]);

  const fetchQuests = async () => {
    try {
      const url = filter === "all"
        ? "/api/life/quests"
        : `/api/life/quests?status=${filter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setQuests(data.quests);
      }
    } catch (error) {
      console.error("Failed to fetch quests:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!authLoaded || loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--rpg-bg-dark)" }}
      >
        <div className="animate-pulse" style={{ color: "var(--rpg-gold)" }}>
          Loading your quests...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4" style={{ background: "var(--rpg-bg-dark)" }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              className="text-2xl mb-2"
              style={{ color: "var(--rpg-text)", textShadow: "0 0 20px rgba(255,255,255,0.2)" }}
            >
              Your Quests
            </h1>
            <p className="text-sm" style={{ color: "var(--rpg-muted)" }}>
              {quests.length} active quest{quests.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href="/life/quests/new"
            className="flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all hover:scale-105"
            style={{
              background: "linear-gradient(135deg, var(--rpg-purple), var(--rpg-teal))",
              color: "#000",
              boxShadow: "0 0 20px rgba(168, 85, 247, 0.3)",
            }}
          >
            <Sparkles className="w-4 h-4" />
            New Quest
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-8">
          {(["ACTIVE", "COMPLETED", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-2 rounded-lg text-sm transition-all"
              style={{
                background: filter === f ? "var(--rpg-purple)" : "var(--rpg-card)",
                color: filter === f ? "#000" : "var(--rpg-muted)",
                border: `2px solid ${filter === f ? "var(--rpg-purple)" : "var(--rpg-border)"}`,
              }}
            >
              {f === "all" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Quest Grid */}
        {quests.length === 0 ? (
          <div
            className="text-center py-16 rounded-xl"
            style={{
              background: "var(--rpg-card)",
              border: "2px solid var(--rpg-border)",
            }}
          >
            <Target className="w-16 h-16 mx-auto mb-4" style={{ color: "var(--rpg-muted)" }} />
            <h2 className="text-lg mb-2" style={{ color: "var(--rpg-text)" }}>
              No quests yet
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--rpg-muted)" }}>
              Start your first quest and turn your goals into adventures
            </p>
            <Link
              href="/life/quests/new"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium"
              style={{
                background: "linear-gradient(135deg, var(--rpg-purple), var(--rpg-teal))",
                color: "#000",
              }}
            >
              <Plus className="w-4 h-4" />
              Create Your First Quest
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {quests.map((quest) => {
              const IconComponent = QUEST_TYPE_ICONS[quest.questType] || Target;
              const stageColor = JOURNEY_STAGE_COLORS[quest.journeyStage] || "#888";

              return (
                <Link
                  key={quest.id}
                  href={`/life/quests/${quest.id}`}
                  className="group rounded-xl p-6 transition-all hover:scale-[1.02]"
                  style={{
                    background: "var(--rpg-card)",
                    border: "2px solid var(--rpg-border)",
                    boxShadow: "0 4px 0 rgba(0,0,0,0.3)",
                  }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                        style={{
                          background: `${stageColor}20`,
                          border: `2px solid ${stageColor}`,
                        }}
                      >
                        {quest.icon || <IconComponent className="w-6 h-6" style={{ color: stageColor }} />}
                      </div>
                      <div>
                        <h3 className="text-base mb-1" style={{ color: "var(--rpg-text)" }}>
                          {quest.title}
                        </h3>
                        <p className="text-xs" style={{ color: stageColor }}>
                          {JOURNEY_STAGE_LABELS[quest.journeyStage]}
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: "var(--rpg-muted)" }}
                    />
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-2">
                      <span style={{ color: "var(--rpg-muted)" }}>
                        {quest.targetCount
                          ? `${quest.currentCount} / ${quest.targetCount} ${quest.countUnit || ""}`
                          : `${quest.progressPercent}% complete`}
                      </span>
                      <span style={{ color: "var(--rpg-gold)" }}>
                        {quest.xpEarned} / {quest.totalXpAvailable} XP
                      </span>
                    </div>
                    <div
                      className="h-3 rounded-full overflow-hidden"
                      style={{ background: "rgba(0,0,0,0.3)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${quest.progressPercent}%`,
                          background: `linear-gradient(90deg, ${stageColor}, var(--rpg-gold))`,
                          boxShadow: `0 0 10px ${stageColor}`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Journey Stages Mini */}
                  <div className="flex justify-between mb-4">
                    {["CALLING", "THRESHOLD", "TESTS", "ORDEAL", "REWARD", "RETURN"].map((stage, i) => {
                      const isActive = stage === quest.journeyStage;
                      const isPast = ["CALLING", "THRESHOLD", "TESTS", "ORDEAL", "REWARD", "RETURN"]
                        .indexOf(stage) < ["CALLING", "THRESHOLD", "TESTS", "ORDEAL", "REWARD", "RETURN"]
                        .indexOf(quest.journeyStage);
                      return (
                        <div
                          key={stage}
                          className="w-4 h-4 rounded-full transition-all"
                          style={{
                            background: isActive
                              ? JOURNEY_STAGE_COLORS[stage]
                              : isPast
                              ? `${JOURNEY_STAGE_COLORS[stage]}60`
                              : "var(--rpg-border)",
                            boxShadow: isActive ? `0 0 8px ${JOURNEY_STAGE_COLORS[stage]}` : "none",
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2" style={{ color: "var(--rpg-muted)" }}>
                      <Clock className="w-3 h-3" />
                      {quest.targetDate
                        ? `Due ${new Date(quest.targetDate).toLocaleDateString()}`
                        : "No deadline"}
                    </div>
                    {quest.aiGenerated && (
                      <div
                        className="flex items-center gap-1 px-2 py-1 rounded"
                        style={{ background: "rgba(168, 85, 247, 0.2)", color: "var(--rpg-purple)" }}
                      >
                        <Sparkles className="w-3 h-3" />
                        AI
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
