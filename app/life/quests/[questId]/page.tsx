"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import {
  ArrowLeft,
  Sparkles,
  Target,
  Trophy,
  Clock,
  Star,
  Check,
  Plus,
  ChevronRight,
  BookOpen,
  Dumbbell,
  Map,
  GraduationCap,
  Flame,
  Rocket,
  Loader2,
  MoreVertical,
  Trash2,
  Pause,
  Play,
} from "lucide-react";

interface Quest {
  id: string;
  title: string;
  description: string | null;
  originalGoal: string;
  questType: string;
  journeyStage: string;
  narratorType: string | null;
  storyHook: string | null;
  icon: string | null;
  status: string;
  progressPercent: number;
  targetCount: number | null;
  currentCount: number;
  countUnit: string | null;
  startDate: string | null;
  targetDate: string | null;
  xpEarned: number;
  totalXpAvailable: number;
  aiGenerated: boolean;
  createdAt: string;
  completedAt: string | null;
  milestones: Milestone[];
  standaloneTasks: Task[];
  recentLogs: Log[];
}

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  journeyStage: string;
  sortOrder: number;
  isCompleted: boolean;
  completedAt: string | null;
  targetCount: number | null;
  currentCount: number;
  xpReward: number;
  bonusXp: number;
  mentorMessage: string | null;
  completionMessage: string | null;
  tasks: Task[];
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  difficulty: string;
  estimatedMinutes?: number;
  dueDate?: string | null;
  isRecurring?: boolean;
  isCompleted: boolean;
  completedAt?: string | null;
  targetCount?: number | null;
  currentCount?: number;
  xpValue: number;
  xpEarned?: number;
  criticalHit?: boolean;
}

interface Log {
  id: string;
  date: string;
  countAdded: number;
  notes: string | null;
  xpEarned: number;
}

const JOURNEY_STAGES = [
  { key: "CALLING", label: "The Calling", icon: "🌟", color: "#a855f7", desc: "Your adventure begins" },
  { key: "THRESHOLD", label: "Threshold", icon: "🚪", color: "#60a5fa", desc: "Crossing into the unknown" },
  { key: "TESTS", label: "The Tests", icon: "⚔️", color: "#f59e0b", desc: "Facing challenges" },
  { key: "ORDEAL", label: "The Ordeal", icon: "🔥", color: "#ef4444", desc: "The crucible" },
  { key: "REWARD", label: "The Reward", icon: "💎", color: "#22c55e", desc: "Breakthrough achieved" },
  { key: "RETURN", label: "The Return", icon: "👑", color: "#fbbf24", desc: "Mastery attained" },
];

const QUEST_TYPE_ICONS: Record<string, any> = {
  COUNTING: BookOpen,
  COLLECTION: Map,
  ACHIEVEMENT: Trophy,
  HABIT: Flame,
  PROJECT: Rocket,
  FITNESS: Dumbbell,
  LEARNING: GraduationCap,
};

export default function QuestDetailPage({ params }: { params: Promise<{ questId: string }> }) {
  const { questId } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [quest, setQuest] = useState<Quest | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [logCount, setLogCount] = useState(1);
  const [logNotes, setLogNotes] = useState("");
  const [showLogForm, setShowLogForm] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (!data.user) {
        router.push("/life");
      }
    });
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchQuest();
    }
  }, [user, questId]);

  const fetchQuest = async () => {
    try {
      const res = await fetch(`/api/life/quests/${questId}`);
      if (res.ok) {
        const data = await res.json();
        setQuest(data.quest);
      } else if (res.status === 404) {
        router.push("/life/quests");
      }
    } catch (error) {
      console.error("Failed to fetch quest:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogProgress = async () => {
    if (!quest) return;

    try {
      const res = await fetch(`/api/life/quests/${questId}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countAdded: logCount,
          notes: logNotes || undefined,
        }),
      });

      if (res.ok) {
        fetchQuest();
        setShowLogForm(false);
        setLogCount(1);
        setLogNotes("");
      }
    } catch (error) {
      console.error("Failed to log progress:", error);
    }
  };

  const handleAbandon = async () => {
    if (!confirm("Are you sure you want to abandon this quest?")) return;

    try {
      await fetch(`/api/life/quests/${questId}`, { method: "DELETE" });
      router.push("/life/quests");
    } catch (error) {
      console.error("Failed to abandon quest:", error);
    }
  };

  if (loading || !quest) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--rpg-bg-dark)" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--rpg-gold)" }} />
      </div>
    );
  }

  const currentStageIndex = JOURNEY_STAGES.findIndex((s) => s.key === quest.journeyStage);
  const currentStage = JOURNEY_STAGES[currentStageIndex];
  const IconComponent = QUEST_TYPE_ICONS[quest.questType] || Target;

  return (
    <div className="min-h-screen pt-24 pb-12 px-4" style={{ background: "var(--rpg-bg-dark)" }}>
      <div className="max-w-4xl mx-auto">
        {/* Back link */}
        <Link
          href="/life/quests"
          className="inline-flex items-center gap-2 mb-6 text-sm transition-colors hover:opacity-80"
          style={{ color: "var(--rpg-muted)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Quests
        </Link>

        {/* Main Quest Card */}
        <div
          className="rounded-xl p-6 mb-8"
          style={{
            background: "var(--rpg-card)",
            border: `2px solid ${currentStage.color}`,
            boxShadow: `0 0 30px ${currentStage.color}30`,
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
                style={{
                  background: `${currentStage.color}20`,
                  border: `2px solid ${currentStage.color}`,
                }}
              >
                {quest.icon || <IconComponent className="w-8 h-8" style={{ color: currentStage.color }} />}
              </div>
              <div>
                <h1 className="text-2xl mb-1" style={{ color: "var(--rpg-text)" }}>
                  {quest.title}
                </h1>
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-1 rounded text-xs"
                    style={{ background: `${currentStage.color}30`, color: currentStage.color }}
                  >
                    {currentStage.label}
                  </span>
                  {quest.aiGenerated && (
                    <span
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                      style={{ background: "rgba(168, 85, 247, 0.2)", color: "var(--rpg-purple)" }}
                    >
                      <Sparkles className="w-3 h-3" /> AI Generated
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: "var(--rpg-muted)" }}
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {showMenu && (
                <div
                  className="absolute right-0 top-full mt-2 py-2 rounded-lg min-w-[160px] z-10"
                  style={{
                    background: "var(--rpg-card)",
                    border: "2px solid var(--rpg-border)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                  }}
                >
                  <button
                    onClick={handleAbandon}
                    className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:opacity-80"
                    style={{ color: "#ef4444" }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Abandon Quest
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Story Hook */}
          {quest.storyHook && (
            <div
              className="p-4 rounded-lg mb-6 italic"
              style={{
                background: "rgba(0,0,0,0.3)",
                borderLeft: `3px solid ${currentStage.color}`,
                color: "var(--rpg-muted)",
              }}
            >
              &quot;{quest.storyHook}&quot;
            </div>
          )}

          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span style={{ color: "var(--rpg-muted)" }}>
                {quest.targetCount
                  ? `${quest.currentCount} / ${quest.targetCount} ${quest.countUnit || ""}`
                  : `${quest.progressPercent}% complete`}
              </span>
              <span style={{ color: "var(--rpg-gold)" }}>
                {quest.xpEarned} / {quest.totalXpAvailable} XP
              </span>
            </div>
            <div className="h-4 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.3)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${quest.progressPercent}%`,
                  background: `linear-gradient(90deg, ${currentStage.color}, var(--rpg-gold))`,
                  boxShadow: `0 0 10px ${currentStage.color}`,
                }}
              />
            </div>
          </div>

          {/* Log Progress Button (for counting quests) */}
          {quest.targetCount && quest.status === "ACTIVE" && (
            <div className="mb-6">
              {showLogForm ? (
                <div
                  className="p-4 rounded-lg"
                  style={{ background: "rgba(0,0,0,0.3)" }}
                >
                  <div className="flex gap-4 mb-4">
                    <div className="flex-1">
                      <label className="block text-xs mb-1" style={{ color: "var(--rpg-muted)" }}>
                        {quest.countUnit || "Count"}
                      </label>
                      <input
                        type="number"
                        value={logCount}
                        onChange={(e) => setLogCount(parseInt(e.target.value) || 1)}
                        min={1}
                        className="w-full p-2 rounded"
                        style={{
                          background: "rgba(0,0,0,0.3)",
                          border: "1px solid var(--rpg-border)",
                          color: "var(--rpg-text)",
                        }}
                      />
                    </div>
                    <div className="flex-[2]">
                      <label className="block text-xs mb-1" style={{ color: "var(--rpg-muted)" }}>
                        Notes (optional)
                      </label>
                      <input
                        type="text"
                        value={logNotes}
                        onChange={(e) => setLogNotes(e.target.value)}
                        placeholder="e.g., Finished 'Project Hail Mary'"
                        className="w-full p-2 rounded"
                        style={{
                          background: "rgba(0,0,0,0.3)",
                          border: "1px solid var(--rpg-border)",
                          color: "var(--rpg-text)",
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowLogForm(false)}
                      className="px-4 py-2 rounded text-sm"
                      style={{ background: "var(--rpg-border)", color: "var(--rpg-text)" }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleLogProgress}
                      className="flex-1 px-4 py-2 rounded text-sm font-medium"
                      style={{ background: currentStage.color, color: "#000" }}
                    >
                      <Plus className="w-4 h-4 inline mr-1" />
                      Log +{logCount} {quest.countUnit}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowLogForm(true)}
                  className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                  style={{ background: currentStage.color, color: "#000" }}
                >
                  <Plus className="w-5 h-5" />
                  Log Progress
                </button>
              )}
            </div>
          )}
        </div>

        {/* Hero's Journey Visualization */}
        <div
          className="rounded-xl p-6 mb-8"
          style={{
            background: "var(--rpg-card)",
            border: "2px solid var(--rpg-border)",
          }}
        >
          <h2 className="text-lg mb-6" style={{ color: "var(--rpg-text)" }}>
            Your Hero&apos;s Journey
          </h2>

          <div className="relative">
            {/* Progress Line */}
            <div
              className="absolute top-6 left-8 right-8 h-1 rounded-full"
              style={{ background: "var(--rpg-border)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(currentStageIndex / (JOURNEY_STAGES.length - 1)) * 100}%`,
                  background: `linear-gradient(90deg, var(--rpg-purple), ${currentStage.color})`,
                  boxShadow: `0 0 10px ${currentStage.color}`,
                }}
              />
            </div>

            {/* Stages */}
            <div className="flex justify-between relative">
              {JOURNEY_STAGES.map((stage, i) => {
                const isActive = i === currentStageIndex;
                const isPast = i < currentStageIndex;
                const milestone = quest.milestones.find((m) => m.journeyStage === stage.key);

                return (
                  <div key={stage.key} className="flex flex-col items-center" style={{ width: "16%" }}>
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all duration-300 ${
                        isActive ? "scale-125" : ""
                      }`}
                      style={{
                        background: isActive || isPast ? stage.color : "var(--rpg-border)",
                        boxShadow: isActive ? `0 0 20px ${stage.color}` : "none",
                      }}
                    >
                      {isPast ? (
                        <Check className="w-6 h-6" style={{ color: "#000" }} />
                      ) : (
                        <span style={{ filter: isActive ? "none" : "grayscale(1)" }}>{stage.icon}</span>
                      )}
                    </div>
                    <p
                      className="text-xs mt-2 text-center font-medium"
                      style={{ color: isActive ? stage.color : "var(--rpg-muted)" }}
                    >
                      {stage.label}
                    </p>
                    {milestone && (
                      <p className="text-[0.65rem] mt-1 text-center" style={{ color: "var(--rpg-muted)" }}>
                        {milestone.title}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Current Stage Message */}
          {currentStage && (
            <div
              className="mt-8 p-4 rounded-lg text-center"
              style={{ background: `${currentStage.color}20`, border: `1px solid ${currentStage.color}` }}
            >
              <p className="text-lg mb-1" style={{ color: currentStage.color }}>
                {currentStage.label}
              </p>
              <p className="text-sm" style={{ color: "var(--rpg-muted)" }}>
                {currentStage.desc}
              </p>
              {quest.milestones.find((m) => m.journeyStage === quest.journeyStage)?.mentorMessage && (
                <p className="text-sm italic mt-2" style={{ color: "var(--rpg-text)" }}>
                  &quot;{quest.milestones.find((m) => m.journeyStage === quest.journeyStage)?.mentorMessage}&quot;
                </p>
              )}
            </div>
          )}
        </div>

        {/* Milestones */}
        {quest.milestones.length > 0 && (
          <div
            className="rounded-xl p-6 mb-8"
            style={{
              background: "var(--rpg-card)",
              border: "2px solid var(--rpg-border)",
            }}
          >
            <h2 className="text-lg mb-4" style={{ color: "var(--rpg-text)" }}>
              Milestones
            </h2>
            <div className="space-y-3">
              {quest.milestones.map((milestone, i) => {
                const stageInfo = JOURNEY_STAGES.find((s) => s.key === milestone.journeyStage);
                return (
                  <div
                    key={milestone.id}
                    className="flex items-center gap-4 p-4 rounded-lg transition-all"
                    style={{
                      background: milestone.isCompleted ? `${stageInfo?.color}20` : "rgba(0,0,0,0.2)",
                      border: `1px solid ${milestone.isCompleted ? stageInfo?.color : "var(--rpg-border)"}`,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{
                        background: milestone.isCompleted ? stageInfo?.color : "var(--rpg-border)",
                      }}
                    >
                      {milestone.isCompleted ? (
                        <Check className="w-5 h-5" style={{ color: "#000" }} />
                      ) : (
                        <span className="text-sm" style={{ color: "var(--rpg-muted)" }}>
                          {i + 1}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p
                        className="text-sm font-medium"
                        style={{ color: milestone.isCompleted ? stageInfo?.color : "var(--rpg-text)" }}
                      >
                        {milestone.title}
                      </p>
                      {milestone.description && (
                        <p className="text-xs" style={{ color: "var(--rpg-muted)" }}>
                          {milestone.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm" style={{ color: "var(--rpg-gold)" }}>
                        +{milestone.xpReward} XP
                      </p>
                      {milestone.bonusXp > 0 && (
                        <p className="text-xs" style={{ color: "var(--rpg-purple)" }}>
                          +{milestone.bonusXp} bonus
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {quest.recentLogs.length > 0 && (
          <div
            className="rounded-xl p-6"
            style={{
              background: "var(--rpg-card)",
              border: "2px solid var(--rpg-border)",
            }}
          >
            <h2 className="text-lg mb-4" style={{ color: "var(--rpg-text)" }}>
              Recent Activity
            </h2>
            <div className="space-y-2">
              {quest.recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-4 p-3 rounded-lg"
                  style={{ background: "rgba(0,0,0,0.2)" }}
                >
                  <div className="text-lg">+{log.countAdded}</div>
                  <div className="flex-1">
                    <p className="text-sm" style={{ color: "var(--rpg-text)" }}>
                      {log.notes || `Logged ${log.countAdded} ${quest.countUnit}`}
                    </p>
                    <p className="text-xs" style={{ color: "var(--rpg-muted)" }}>
                      {new Date(log.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-sm" style={{ color: "var(--rpg-gold)" }}>
                    +{log.xpEarned} XP
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
