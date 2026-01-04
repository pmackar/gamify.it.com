"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import {
  Sparkles,
  Target,
  BookOpen,
  Trophy,
  Flame,
  Rocket,
  GraduationCap,
  Dumbbell,
  Map,
  ChevronRight,
  Zap,
  Users,
  Star,
  Crown,
  Lock,
} from "lucide-react";

const QUEST_TYPES = [
  {
    icon: BookOpen,
    name: "Reading",
    example: '"Read 52 books this year"',
    color: "#60a5fa",
  },
  {
    icon: Trophy,
    name: "Achievement",
    example: '"Get an A in calculus"',
    color: "#fbbf24",
  },
  {
    icon: Dumbbell,
    name: "Fitness",
    example: '"Run a marathon by December"',
    color: "#ef4444",
  },
  {
    icon: GraduationCap,
    name: "Learning",
    example: '"Learn Spanish fluently"',
    color: "#a78bfa",
  },
  {
    icon: Map,
    name: "Collection",
    example: '"Visit every US National Park"',
    color: "#34d399",
  },
  {
    icon: Flame,
    name: "Habit",
    example: '"Meditate daily for 100 days"',
    color: "#f97316",
  },
];

const JOURNEY_STAGES = [
  { name: "The Calling", percent: "0%", desc: "Accept your quest" },
  { name: "Threshold", percent: "25%", desc: "Cross into the unknown" },
  { name: "The Tests", percent: "50%", desc: "Face your challenges" },
  { name: "The Ordeal", percent: "75%", desc: "Survive the crucible" },
  { name: "The Reward", percent: "90%", desc: "Claim your prize" },
  { name: "The Return", percent: "100%", desc: "Master achieved" },
];

export default function LifeQuestsLanding() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [hasBetaAccess, setHasBetaAccess] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [activeStage, setActiveStage] = useState(0);
  const fullText = "Turn any goal into an epic quest.";

  // Memoize particle positions so they don't jump on re-render
  const particles = useMemo(() =>
    [...Array(20)].map(() => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 4,
    })),
  []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (data.user) {
        // Check for life_beta_access feature flag
        const { data: subscription } = await supabase
          .from("user_subscriptions")
          .select("features")
          .eq("user_id", data.user.id)
          .eq("app_id", "life")
          .single();

        if (subscription?.features?.includes("life_beta_access")) {
          setHasBetaAccess(true);
        }
      }
    });
  }, []);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i <= fullText.length) {
        setTypedText(fullText.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);
    return () => clearInterval(cursorInterval);
  }, []);

  useEffect(() => {
    const stageInterval = setInterval(() => {
      setActiveStage((prev) => (prev + 1) % JOURNEY_STAGES.length);
    }, 2000);
    return () => clearInterval(stageInterval);
  }, []);

  const handleStart = () => {
    if (!hasBetaAccess) {
      return; // Coming soon - no action
    }
    if (user) {
      router.push("/life/quests");
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--rpg-bg-dark)" }}>
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-30">
          <div
            className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse"
            style={{ background: "var(--rpg-purple)", animationDuration: "4s" }}
          />
          <div
            className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse"
            style={{ background: "var(--rpg-teal)", animationDelay: "2s", animationDuration: "4s" }}
          />
          <div
            className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full blur-3xl animate-pulse"
            style={{ background: "var(--rpg-gold)", animationDelay: "1s", animationDuration: "4s" }}
          />
        </div>
        {/* Floating particles */}
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full animate-float"
            style={{
              background: "var(--rpg-gold)",
              left: `${p.left}%`,
              top: `${p.top}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-4">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 animate-fadeIn"
            style={{
              background: "rgba(168, 85, 247, 0.2)",
              border: "1px solid var(--rpg-purple)",
            }}
          >
            <Sparkles className="w-4 h-4" style={{ color: "var(--rpg-purple)" }} />
            <span className="text-xs" style={{ color: "var(--rpg-purple)" }}>
              AI-Powered Life Gamification
            </span>
          </div>

          {/* Main headline */}
          <h1
            className="text-4xl md:text-6xl font-bold mb-6"
            style={{
              color: "var(--rpg-text)",
              textShadow: "0 0 40px rgba(255, 255, 255, 0.3)",
            }}
          >
            Life Quests
          </h1>

          {/* Typed subtitle */}
          <p
            className="text-xl md:text-2xl mb-8 h-10"
            style={{ color: "var(--rpg-muted)" }}
          >
            {typedText}
            <span
              className="inline-block w-0.5 h-6 ml-1 align-middle"
              style={{
                background: "var(--rpg-teal)",
                opacity: showCursor ? 1 : 0,
              }}
            />
          </p>

          {/* CTA */}
          {hasBetaAccess ? (
            <button
              onClick={handleStart}
              className="group relative inline-flex items-center gap-3 px-8 py-4 text-lg font-bold rounded-lg transition-all duration-300 hover:scale-105"
              style={{
                background: "linear-gradient(135deg, var(--rpg-teal), var(--rpg-purple))",
                color: "#000",
                boxShadow: "0 0 30px rgba(95, 191, 138, 0.4), 0 4px 0 rgba(0, 0, 0, 0.3)",
              }}
            >
              <Zap className="w-5 h-5" />
              Begin Your Journey
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          ) : (
            <div
              className="inline-flex items-center gap-3 px-8 py-4 text-lg font-bold rounded-lg cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, rgba(100, 100, 100, 0.5), rgba(80, 80, 80, 0.5))",
                color: "var(--rpg-muted)",
                boxShadow: "0 4px 0 rgba(0, 0, 0, 0.3)",
                border: "2px solid var(--rpg-border)",
              }}
            >
              <Lock className="w-5 h-5" />
              Coming Soon
            </div>
          )}

          <p className="mt-4 text-sm" style={{ color: "var(--rpg-muted)" }}>
            {hasBetaAccess
              ? "Free tier includes 3 AI-generated quests per month"
              : "Life Quests is currently in private beta"}
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2
            className="text-2xl md:text-3xl text-center mb-16"
            style={{ color: "var(--rpg-gold)", textShadow: "0 0 20px var(--rpg-gold-glow)" }}
          >
            Transform Goals Into Adventures
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div
              className="relative p-6 rounded-xl text-center"
              style={{
                background: "var(--rpg-card)",
                border: "2px solid var(--rpg-border)",
              }}
            >
              <div
                className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: "var(--rpg-purple)", color: "#000" }}
              >
                1
              </div>
              <Target className="w-12 h-12 mx-auto mb-4 mt-4" style={{ color: "var(--rpg-teal)" }} />
              <h3 className="text-lg mb-2" style={{ color: "var(--rpg-text)" }}>
                Speak Your Goal
              </h3>
              <p className="text-sm" style={{ color: "var(--rpg-muted)" }}>
                Just type what you want to achieve in plain English. &quot;Read 52 books this year&quot;
              </p>
            </div>

            {/* Step 2 */}
            <div
              className="relative p-6 rounded-xl text-center"
              style={{
                background: "var(--rpg-card)",
                border: "2px solid var(--rpg-border)",
              }}
            >
              <div
                className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: "var(--rpg-purple)", color: "#000" }}
              >
                2
              </div>
              <Sparkles className="w-12 h-12 mx-auto mb-4 mt-4" style={{ color: "var(--rpg-gold)" }} />
              <h3 className="text-lg mb-2" style={{ color: "var(--rpg-text)" }}>
                AI Creates Your Quest
              </h3>
              <p className="text-sm" style={{ color: "var(--rpg-muted)" }}>
                Our AI decomposes your goal into milestones, tasks, and XP rewards
              </p>
            </div>

            {/* Step 3 */}
            <div
              className="relative p-6 rounded-xl text-center"
              style={{
                background: "var(--rpg-card)",
                border: "2px solid var(--rpg-border)",
              }}
            >
              <div
                className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: "var(--rpg-purple)", color: "#000" }}
              >
                3
              </div>
              <Rocket className="w-12 h-12 mx-auto mb-4 mt-4" style={{ color: "var(--rpg-purple)" }} />
              <h3 className="text-lg mb-2" style={{ color: "var(--rpg-text)" }}>
                Live Your Adventure
              </h3>
              <p className="text-sm" style={{ color: "var(--rpg-muted)" }}>
                Track progress through the Hero&apos;s Journey stages and earn XP
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quest Types Showcase */}
      <section className="relative py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2
            className="text-2xl md:text-3xl text-center mb-4"
            style={{ color: "var(--rpg-teal)", textShadow: "0 0 20px var(--rpg-teal-glow)" }}
          >
            Any Goal. Any Dream.
          </h2>
          <p className="text-center mb-12" style={{ color: "var(--rpg-muted)" }}>
            Life Quests adapts to whatever you want to achieve
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {QUEST_TYPES.map((type, i) => (
              <div
                key={type.name}
                className="p-4 rounded-lg transition-all hover:scale-105 cursor-pointer"
                style={{
                  background: "var(--rpg-card)",
                  border: `2px solid ${type.color}30`,
                  boxShadow: `0 0 20px ${type.color}20`,
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                <type.icon className="w-8 h-8 mb-3" style={{ color: type.color }} />
                <h3 className="text-base mb-1" style={{ color: "var(--rpg-text)" }}>
                  {type.name}
                </h3>
                <p className="text-xs italic" style={{ color: "var(--rpg-muted)" }}>
                  {type.example}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hero's Journey Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <h2
            className="text-2xl md:text-3xl text-center mb-4"
            style={{ color: "var(--rpg-gold)", textShadow: "0 0 20px var(--rpg-gold-glow)" }}
          >
            The Hero&apos;s Journey
          </h2>
          <p className="text-center mb-12" style={{ color: "var(--rpg-muted)" }}>
            Every quest follows the ancient storytelling structure
          </p>

          {/* Journey visualization */}
          <div className="relative">
            {/* Progress line */}
            <div
              className="absolute top-8 left-0 right-0 h-1 rounded-full"
              style={{ background: "var(--rpg-border)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(activeStage / (JOURNEY_STAGES.length - 1)) * 100}%`,
                  background: "linear-gradient(90deg, var(--rpg-teal), var(--rpg-gold))",
                  boxShadow: "0 0 10px var(--rpg-teal)",
                }}
              />
            </div>

            {/* Stages */}
            <div className="flex justify-between relative">
              {JOURNEY_STAGES.map((stage, i) => (
                <div
                  key={stage.name}
                  className="flex flex-col items-center text-center"
                  style={{ width: "16%" }}
                >
                  <div
                    className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center mb-3 transition-all duration-300 ${
                      i <= activeStage ? "scale-110" : "scale-100"
                    }`}
                    style={{
                      background: i <= activeStage ? "var(--rpg-gold)" : "var(--rpg-border)",
                      boxShadow: i === activeStage ? "0 0 20px var(--rpg-gold)" : "none",
                    }}
                  >
                    {i <= activeStage ? (
                      <Star
                        className="w-3 h-3 md:w-4 md:h-4"
                        fill="#000"
                        style={{ color: "#000" }}
                      />
                    ) : (
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: "var(--rpg-muted)" }}
                      />
                    )}
                  </div>
                  <p
                    className="text-[0.6rem] md:text-xs font-medium mb-1 transition-colors"
                    style={{
                      color: i === activeStage ? "var(--rpg-gold)" : "var(--rpg-text)",
                    }}
                  >
                    {stage.name}
                  </p>
                  <p
                    className="text-[0.5rem] md:text-xs hidden md:block"
                    style={{ color: "var(--rpg-muted)" }}
                  >
                    {stage.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Current stage highlight */}
          <div
            className="mt-12 p-6 rounded-xl text-center max-w-md mx-auto"
            style={{
              background: "var(--rpg-card)",
              border: "2px solid var(--rpg-gold)",
              boxShadow: "0 0 30px var(--rpg-gold-glow)",
            }}
          >
            <Crown className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--rpg-gold)" }} />
            <h3 className="text-lg mb-2" style={{ color: "var(--rpg-gold)" }}>
              {JOURNEY_STAGES[activeStage].name}
            </h3>
            <p style={{ color: "var(--rpg-muted)" }}>
              {JOURNEY_STAGES[activeStage].desc}
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            {/* AI-Powered */}
            <div
              className="p-6 rounded-xl"
              style={{
                background: "linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(95, 191, 138, 0.1))",
                border: "2px solid var(--rpg-purple)",
              }}
            >
              <Sparkles className="w-10 h-10 mb-4" style={{ color: "var(--rpg-purple)" }} />
              <h3 className="text-lg mb-2" style={{ color: "var(--rpg-text)" }}>
                AI Goal Decomposition
              </h3>
              <p className="text-sm" style={{ color: "var(--rpg-muted)" }}>
                Tell us your goal and our AI breaks it into actionable milestones with smart scheduling
              </p>
            </div>

            {/* XP System */}
            <div
              className="p-6 rounded-xl"
              style={{
                background: "linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(239, 68, 68, 0.1))",
                border: "2px solid var(--rpg-gold)",
              }}
            >
              <Zap className="w-10 h-10 mb-4" style={{ color: "var(--rpg-gold)" }} />
              <h3 className="text-lg mb-2" style={{ color: "var(--rpg-text)" }}>
                Dynamic XP Rewards
              </h3>
              <p className="text-sm" style={{ color: "var(--rpg-muted)" }}>
                Earn XP based on difficulty, time, and streaks. Critical hits give bonus XP!
              </p>
            </div>

            {/* Social */}
            <div
              className="p-6 rounded-xl"
              style={{
                background: "linear-gradient(135deg, rgba(95, 191, 138, 0.2), rgba(96, 165, 250, 0.1))",
                border: "2px solid var(--rpg-teal)",
              }}
            >
              <Users className="w-10 h-10 mb-4" style={{ color: "var(--rpg-teal)" }} />
              <h3 className="text-lg mb-2" style={{ color: "var(--rpg-text)" }}>
                Party Quests
              </h3>
              <p className="text-sm" style={{ color: "var(--rpg-muted)" }}>
                Invite friends to join your quests for accountability and bonus XP
              </p>
            </div>

            {/* Cross-app */}
            <div
              className="p-6 rounded-xl"
              style={{
                background: "linear-gradient(135deg, rgba(96, 165, 250, 0.2), rgba(168, 85, 247, 0.1))",
                border: "2px solid #60a5fa",
              }}
            >
              <Rocket className="w-10 h-10 mb-4" style={{ color: "#60a5fa" }} />
              <h3 className="text-lg mb-2" style={{ color: "var(--rpg-text)" }}>
                Cross-App Integration
              </h3>
              <p className="text-sm" style={{ color: "var(--rpg-muted)" }}>
                Link quests to Fitness, Travel, or Day Quest for automatic progress tracking
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2
            className="text-3xl md:text-4xl mb-6"
            style={{
              color: "var(--rpg-text)",
              textShadow: "0 0 30px rgba(255, 255, 255, 0.3)",
            }}
          >
            {hasBetaAccess
              ? "Ready to become the hero of your own story?"
              : "Life Quests is coming soon"}
          </h2>
          {hasBetaAccess ? (
            <button
              onClick={handleStart}
              className="group relative inline-flex items-center gap-3 px-10 py-5 text-xl font-bold rounded-lg transition-all duration-300 hover:scale-105"
              style={{
                background: "linear-gradient(135deg, var(--rpg-gold), var(--rpg-purple))",
                color: "#000",
                boxShadow: "0 0 40px rgba(251, 191, 36, 0.4), 0 4px 0 rgba(0, 0, 0, 0.3)",
              }}
            >
              <Crown className="w-6 h-6" />
              Start Your First Quest
              <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
          ) : (
            <div
              className="inline-flex items-center gap-3 px-10 py-5 text-xl font-bold rounded-lg cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, rgba(100, 100, 100, 0.5), rgba(80, 80, 80, 0.5))",
                color: "var(--rpg-muted)",
                boxShadow: "0 4px 0 rgba(0, 0, 0, 0.3)",
                border: "2px solid var(--rpg-border)",
              }}
            >
              <Lock className="w-6 h-6" />
              Coming Soon
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 text-center" style={{ borderTop: "1px solid var(--rpg-border)" }}>
        <p className="text-sm" style={{ color: "var(--rpg-muted)" }}>
          Part of the{" "}
          <Link href="/" style={{ color: "var(--rpg-teal)" }}>
            gamify.it.com
          </Link>{" "}
          family
        </p>
      </footer>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.5; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 1; }
        }
        .animate-float {
          animation: float linear infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
