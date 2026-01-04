"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Wand2,
  Edit3,
  BookOpen,
  Trophy,
  Dumbbell,
  Map,
  GraduationCap,
  Flame,
  Rocket,
  Calendar,
  Target,
  Loader2,
  Check,
  Star,
} from "lucide-react";

const QUEST_TYPES = [
  { value: "COUNTING", label: "Counting", icon: BookOpen, example: "Read 52 books" },
  { value: "ACHIEVEMENT", label: "Achievement", icon: Trophy, example: "Get an A" },
  { value: "FITNESS", label: "Fitness", icon: Dumbbell, example: "Run a marathon" },
  { value: "COLLECTION", label: "Collection", icon: Map, example: "Visit every state" },
  { value: "LEARNING", label: "Learning", icon: GraduationCap, example: "Learn Spanish" },
  { value: "HABIT", label: "Habit", icon: Flame, example: "Meditate daily" },
  { value: "PROJECT", label: "Project", icon: Rocket, example: "Launch my app" },
];

interface GeneratedQuest {
  title: string;
  description: string;
  questType: string;
  icon: string;
  storyHook: string;
  narratorType: string;
  targetCount: number | null;
  countUnit: string | null;
  totalXpAvailable: number;
  originalGoal: string;
  milestones: {
    title: string;
    description: string;
    journeyStage: string;
    xpReward: number;
    bonusXp: number;
    mentorMessage: string;
    completionMessage: string;
    targetCount: number | null;
  }[];
}

export default function NewQuestPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (!data.user) {
        router.push("/life");
      }
    });
  }, [router]);

  // Step state
  const [step, setStep] = useState<"input" | "generating" | "preview" | "manual">("input");

  // Input state
  const [goal, setGoal] = useState("");
  const [deadline, setDeadline] = useState("");
  const [hoursPerWeek, setHoursPerWeek] = useState("");

  // Generated quest state
  const [generatedQuest, setGeneratedQuest] = useState<GeneratedQuest | null>(null);
  const [aiUsage, setAiUsage] = useState<{ used: number; limit: number } | null>(null);
  const [error, setError] = useState("");

  // Manual mode state
  const [manualTitle, setManualTitle] = useState("");
  const [manualType, setManualType] = useState("COUNTING");
  const [manualTarget, setManualTarget] = useState("");
  const [manualUnit, setManualUnit] = useState("");

  const [creating, setCreating] = useState(false);

  const handleGenerate = async () => {
    if (!goal.trim()) return;

    setStep("generating");
    setError("");

    try {
      const res = await fetch("/api/life/quests/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: goal.trim(),
          deadline: deadline || undefined,
          hoursPerWeek: hoursPerWeek ? parseInt(hoursPerWeek) : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setError(data.message || "AI generation limit reached");
          setAiUsage({ used: data.used, limit: data.limit });
          setStep("input");
          return;
        }
        throw new Error(data.error || "Generation failed");
      }

      setGeneratedQuest(data.quest);
      setAiUsage(data.usage);
      setStep("preview");
    } catch (err: any) {
      setError(err.message);
      setStep("input");
    }
  };

  const handleCreateQuest = async (questData: any) => {
    setCreating(true);
    try {
      const res = await fetch("/api/life/quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(questData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create quest");
      }

      const data = await res.json();
      router.push(`/life/quests/${data.quest.id}`);
    } catch (err: any) {
      setError(err.message);
      setCreating(false);
    }
  };

  const handleCreateFromGenerated = () => {
    if (!generatedQuest) return;
    handleCreateQuest({
      ...generatedQuest,
      aiGenerated: true,
    });
  };

  const handleCreateManual = () => {
    if (!manualTitle.trim()) return;
    handleCreateQuest({
      title: manualTitle,
      questType: manualType,
      targetCount: manualTarget ? parseInt(manualTarget) : null,
      countUnit: manualUnit || null,
      originalGoal: manualTitle,
      totalXpAvailable: 1000,
      aiGenerated: false,
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--rpg-bg-dark)" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--rpg-gold)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4" style={{ background: "var(--rpg-bg-dark)" }}>
      <div className="max-w-2xl mx-auto">
        {/* Back link */}
        <Link
          href="/life/quests"
          className="inline-flex items-center gap-2 mb-8 text-sm transition-colors hover:opacity-80"
          style={{ color: "var(--rpg-muted)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Quests
        </Link>

        {/* Step: Input */}
        {step === "input" && (
          <div
            className="rounded-xl p-8"
            style={{
              background: "var(--rpg-card)",
              border: "2px solid var(--rpg-border)",
              boxShadow: "0 4px 0 rgba(0,0,0,0.3)",
            }}
          >
            <div className="text-center mb-8">
              <Sparkles className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--rpg-purple)" }} />
              <h1 className="text-2xl mb-2" style={{ color: "var(--rpg-text)" }}>
                Create a New Quest
              </h1>
              <p style={{ color: "var(--rpg-muted)" }}>
                Describe your goal and let AI transform it into an epic adventure
              </p>
            </div>

            {error && (
              <div
                className="p-4 rounded-lg mb-6"
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#ef4444",
                }}
              >
                {error}
              </div>
            )}

            <div className="space-y-6">
              {/* Goal input */}
              <div>
                <label className="block text-sm mb-2" style={{ color: "var(--rpg-text)" }}>
                  What do you want to achieve?
                </label>
                <textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g., Read 52 books this year, Run a marathon by December, Learn Spanish..."
                  rows={3}
                  className="w-full p-4 rounded-lg resize-none"
                  style={{
                    background: "rgba(0,0,0,0.3)",
                    border: "2px solid var(--rpg-border)",
                    color: "var(--rpg-text)",
                    outline: "none",
                  }}
                />
              </div>

              {/* Optional fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: "var(--rpg-muted)" }}>
                    Deadline (optional)
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full p-3 rounded-lg"
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      border: "2px solid var(--rpg-border)",
                      color: "var(--rpg-text)",
                      outline: "none",
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: "var(--rpg-muted)" }}>
                    Hours/week (optional)
                  </label>
                  <input
                    type="number"
                    value={hoursPerWeek}
                    onChange={(e) => setHoursPerWeek(e.target.value)}
                    placeholder="e.g., 5"
                    className="w-full p-3 rounded-lg"
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      border: "2px solid var(--rpg-border)",
                      color: "var(--rpg-text)",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* AI Usage indicator */}
              {aiUsage && (
                <div className="text-center text-sm" style={{ color: "var(--rpg-muted)" }}>
                  AI generations: {aiUsage.used} / {aiUsage.limit} this month
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  onClick={handleGenerate}
                  disabled={!goal.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-lg font-medium transition-all disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, var(--rpg-purple), var(--rpg-teal))",
                    color: "#000",
                  }}
                >
                  <Wand2 className="w-5 h-5" />
                  Generate with AI
                </button>
                <button
                  onClick={() => {
                    setManualTitle(goal);
                    setStep("manual");
                  }}
                  className="px-6 py-4 rounded-lg font-medium transition-all"
                  style={{
                    background: "var(--rpg-border)",
                    color: "var(--rpg-text)",
                  }}
                >
                  <Edit3 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Generating */}
        {step === "generating" && (
          <div
            className="rounded-xl p-12 text-center"
            style={{
              background: "var(--rpg-card)",
              border: "2px solid var(--rpg-border)",
            }}
          >
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div
                className="absolute inset-0 rounded-full animate-ping"
                style={{ background: "var(--rpg-purple)", opacity: 0.3 }}
              />
              <div
                className="absolute inset-2 rounded-full animate-pulse"
                style={{ background: "var(--rpg-purple)", opacity: 0.5 }}
              />
              <Sparkles
                className="absolute inset-0 m-auto w-10 h-10 animate-spin"
                style={{ color: "var(--rpg-gold)", animationDuration: "3s" }}
              />
            </div>
            <h2 className="text-xl mb-2" style={{ color: "var(--rpg-text)" }}>
              Crafting Your Quest...
            </h2>
            <p style={{ color: "var(--rpg-muted)" }}>
              The Quest Architect is designing your adventure
            </p>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && generatedQuest && (
          <div className="space-y-6">
            {/* Quest Card */}
            <div
              className="rounded-xl p-6"
              style={{
                background: "var(--rpg-card)",
                border: "2px solid var(--rpg-purple)",
                boxShadow: "0 0 30px rgba(168, 85, 247, 0.2)",
              }}
            >
              {/* Header */}
              <div className="flex items-start gap-4 mb-6">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
                  style={{
                    background: "rgba(168, 85, 247, 0.2)",
                    border: "2px solid var(--rpg-purple)",
                  }}
                >
                  {generatedQuest.icon}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl mb-1" style={{ color: "var(--rpg-text)" }}>
                    {generatedQuest.title}
                  </h2>
                  <p className="text-sm" style={{ color: "var(--rpg-muted)" }}>
                    {generatedQuest.description}
                  </p>
                </div>
              </div>

              {/* Story Hook */}
              {generatedQuest.storyHook && (
                <div
                  className="p-4 rounded-lg mb-6 italic"
                  style={{
                    background: "rgba(0,0,0,0.3)",
                    borderLeft: "3px solid var(--rpg-gold)",
                    color: "var(--rpg-muted)",
                  }}
                >
                  &quot;{generatedQuest.storyHook}&quot;
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-3 rounded-lg" style={{ background: "rgba(0,0,0,0.2)" }}>
                  <p className="text-xs mb-1" style={{ color: "var(--rpg-muted)" }}>
                    Type
                  </p>
                  <p className="text-sm font-medium" style={{ color: "var(--rpg-text)" }}>
                    {generatedQuest.questType}
                  </p>
                </div>
                {generatedQuest.targetCount && (
                  <div className="text-center p-3 rounded-lg" style={{ background: "rgba(0,0,0,0.2)" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--rpg-muted)" }}>
                      Target
                    </p>
                    <p className="text-sm font-medium" style={{ color: "var(--rpg-text)" }}>
                      {generatedQuest.targetCount} {generatedQuest.countUnit}
                    </p>
                  </div>
                )}
                <div className="text-center p-3 rounded-lg" style={{ background: "rgba(0,0,0,0.2)" }}>
                  <p className="text-xs mb-1" style={{ color: "var(--rpg-muted)" }}>
                    Total XP
                  </p>
                  <p className="text-sm font-medium" style={{ color: "var(--rpg-gold)" }}>
                    {generatedQuest.totalXpAvailable}
                  </p>
                </div>
              </div>

              {/* Milestones */}
              <h3 className="text-sm mb-4" style={{ color: "var(--rpg-text)" }}>
                Hero&apos;s Journey Milestones
              </h3>
              <div className="space-y-3">
                {generatedQuest.milestones.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-3 rounded-lg"
                    style={{ background: "rgba(0,0,0,0.2)" }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                      style={{ background: "var(--rpg-border)", color: "var(--rpg-text)" }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm" style={{ color: "var(--rpg-text)" }}>
                        {m.title}
                      </p>
                      <p className="text-xs" style={{ color: "var(--rpg-muted)" }}>
                        {m.journeyStage} • +{m.xpReward} XP
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => setStep("input")}
                className="px-6 py-4 rounded-lg font-medium"
                style={{ background: "var(--rpg-border)", color: "var(--rpg-text)" }}
              >
                <ArrowLeft className="w-5 h-5 inline mr-2" />
                Regenerate
              </button>
              <button
                onClick={handleCreateFromGenerated}
                disabled={creating}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-lg font-medium transition-all disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, var(--rpg-teal), var(--rpg-gold))",
                  color: "#000",
                }}
              >
                {creating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Begin This Quest
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step: Manual */}
        {step === "manual" && (
          <div
            className="rounded-xl p-8"
            style={{
              background: "var(--rpg-card)",
              border: "2px solid var(--rpg-border)",
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <Edit3 className="w-6 h-6" style={{ color: "var(--rpg-teal)" }} />
              <h1 className="text-xl" style={{ color: "var(--rpg-text)" }}>
                Create Quest Manually
              </h1>
            </div>

            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm mb-2" style={{ color: "var(--rpg-text)" }}>
                  Quest Title
                </label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="e.g., The Reader's Odyssey"
                  className="w-full p-4 rounded-lg"
                  style={{
                    background: "rgba(0,0,0,0.3)",
                    border: "2px solid var(--rpg-border)",
                    color: "var(--rpg-text)",
                    outline: "none",
                  }}
                />
              </div>

              {/* Quest Type */}
              <div>
                <label className="block text-sm mb-2" style={{ color: "var(--rpg-text)" }}>
                  Quest Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {QUEST_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setManualType(type.value)}
                      className="flex items-center gap-3 p-3 rounded-lg transition-all"
                      style={{
                        background: manualType === type.value ? "var(--rpg-purple)" : "rgba(0,0,0,0.3)",
                        border: `2px solid ${manualType === type.value ? "var(--rpg-purple)" : "var(--rpg-border)"}`,
                        color: manualType === type.value ? "#000" : "var(--rpg-text)",
                      }}
                    >
                      <type.icon className="w-4 h-4" />
                      <span className="text-sm">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Count (for counting quests) */}
              {manualType === "COUNTING" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2" style={{ color: "var(--rpg-muted)" }}>
                      Target Number
                    </label>
                    <input
                      type="number"
                      value={manualTarget}
                      onChange={(e) => setManualTarget(e.target.value)}
                      placeholder="e.g., 52"
                      className="w-full p-3 rounded-lg"
                      style={{
                        background: "rgba(0,0,0,0.3)",
                        border: "2px solid var(--rpg-border)",
                        color: "var(--rpg-text)",
                        outline: "none",
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2" style={{ color: "var(--rpg-muted)" }}>
                      Unit
                    </label>
                    <input
                      type="text"
                      value={manualUnit}
                      onChange={(e) => setManualUnit(e.target.value)}
                      placeholder="e.g., books"
                      className="w-full p-3 rounded-lg"
                      style={{
                        background: "rgba(0,0,0,0.3)",
                        border: "2px solid var(--rpg-border)",
                        color: "var(--rpg-text)",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  onClick={() => setStep("input")}
                  className="px-6 py-4 rounded-lg font-medium"
                  style={{ background: "var(--rpg-border)", color: "var(--rpg-text)" }}
                >
                  Back
                </button>
                <button
                  onClick={handleCreateManual}
                  disabled={!manualTitle.trim() || creating}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-lg font-medium transition-all disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, var(--rpg-teal), var(--rpg-gold))",
                    color: "#000",
                  }}
                >
                  {creating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Create Quest
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
