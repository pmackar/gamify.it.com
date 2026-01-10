"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Activity,
  TrendingUp,
  AlertCircle,
  Plus,
  ChevronRight,
  Dumbbell,
  Clock,
  Search,
  X,
  Check,
  UserPlus,
  BookOpen,
  ShieldX,
} from "lucide-react";
import { usePermissionsStandalone } from "@/hooks/usePermissions";

interface DashboardStats {
  total_athletes: number;
  pending_invites: number;
  workouts_this_week: number;
  compliance_rate: number | null;
  max_athletes: number;
}

interface AthleteNeedingAttention {
  athlete: {
    id: string;
    display_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  days_since_workout: number | null;
  reason: string;
}

interface RecentActivity {
  type: string;
  athlete: {
    id: string;
    display_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  workout: {
    date: string;
    duration: number;
    exercises: number;
    totalXP: number;
  };
  program: string | null;
}

interface CoachProfile {
  id: string;
  business_name: string | null;
  specializations: string[];
  bio: string | null;
  is_verified: boolean;
  max_athletes: number;
  athlete_count: number;
}

interface Athlete {
  relationship_id: string;
  status: string;
  invited_at: string;
  accepted_at: string | null;
  coach_notes: string | null;
  athlete: {
    id: string;
    email: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    main_level: number | null;
    total_xp: number | null;
  };
  current_program: { id: string; name: string } | null;
  fitness_summary: {
    level: number;
    total_workouts: number;
    last_workout_date: string | null;
  } | null;
}

export default function CoachDashboard() {
  const router = useRouter();
  const { isCoach: hasCoachTier, isAdmin, loading: permissionsLoading } = usePermissionsStandalone();
  const [loading, setLoading] = useState(true);
  const [isCoach, setIsCoach] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [needingAttention, setNeedingAttention] = useState<AthleteNeedingAttention[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);

  // Check if user has permission to access coach features
  const hasCoachPermission = hasCoachTier() || isAdmin();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");

  useEffect(() => {
    checkCoachStatus();
  }, []);

  const checkCoachStatus = async () => {
    try {
      const res = await fetch("/api/fitness/coach/profile");
      if (res.ok) {
        const data = await res.json();
        setCoachProfile(data.coach);
        setIsCoach(true);
        await loadDashboard();
      } else if (res.status === 404) {
        setIsCoach(false);
      }
    } catch (error) {
      console.error("Error checking coach status:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async () => {
    try {
      const [dashboardRes, athletesRes] = await Promise.all([
        fetch("/api/fitness/coach/dashboard"),
        fetch("/api/fitness/coach/athletes"),
      ]);

      if (dashboardRes.ok) {
        const data = await dashboardRes.json();
        setStats(data.stats);
        setNeedingAttention(data.athletes_needing_attention || []);
        setRecentActivity(data.recent_activity || []);
      }

      if (athletesRes.ok) {
        const data = await athletesRes.json();
        setAthletes(data.athletes || []);
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    }
  };

  const handleRegister = async () => {
    setRegistering(true);
    try {
      const res = await fetch("/api/fitness/coach/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const data = await res.json();
        setCoachProfile(data.coach);
        setIsCoach(true);
        await loadDashboard();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to register");
      }
    } catch (error) {
      console.error("Error registering:", error);
      alert("Failed to register as coach");
    } finally {
      setRegistering(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setInviteError("");

    try {
      const res = await fetch("/api/fitness/coach/athletes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });

      const data = await res.json();

      if (res.ok) {
        setShowInviteModal(false);
        setInviteEmail("");
        await loadDashboard();
      } else {
        setInviteError(data.error || "Failed to send invite");
      }
    } catch (error) {
      setInviteError("Failed to send invite");
    } finally {
      setInviting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs}h ${remainingMins}m`;
  };

  if (loading || permissionsLoading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <div className="text-center">
          <Dumbbell className="w-12 h-12 text-[#FF6B6B] animate-pulse mx-auto mb-4" />
          <p className="text-gray-400 font-mono text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Access denied - user doesn't have coach tier or admin role
  if (!hasCoachPermission) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] navbar-offset px-4">
        <div className="max-w-md mx-auto text-center">
          <div
            className="p-8 rounded-lg"
            style={{
              background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
              border: "2px solid #3d3d4d",
              boxShadow: "0 4px 0 rgba(0, 0, 0, 0.3)",
            }}
          >
            <ShieldX className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h1
              className="text-xl mb-4"
              style={{
                fontFamily: "'Press Start 2P', monospace",
                color: "#FF6B6B",
              }}
            >
              ACCESS DENIED
            </h1>
            <p className="text-gray-400 mb-6 text-sm leading-relaxed">
              Coach features are only available to users with Coach tier access.
              Please upgrade your subscription to access this feature.
            </p>
            <Link
              href="/fitness"
              className="inline-block py-3 px-6 rounded-lg font-bold transition-all"
              style={{
                background: "linear-gradient(180deg, #FF6B6B 0%, #cc5555 100%)",
                boxShadow: "0 4px 0 #992222",
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "10px",
                color: "white",
              }}
            >
              BACK TO FITNESS
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Not a coach - show registration
  if (!isCoach) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] navbar-offset px-4">
        <div className="max-w-md mx-auto text-center">
          <div
            className="p-8 rounded-lg"
            style={{
              background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
              border: "2px solid #3d3d4d",
              boxShadow: "0 4px 0 rgba(0, 0, 0, 0.3)",
            }}
          >
            <Users className="w-16 h-16 text-[#FF6B6B] mx-auto mb-6" />
            <h1
              className="text-xl mb-4"
              style={{
                fontFamily: "'Press Start 2P', monospace",
                color: "#FFD700",
              }}
            >
              BECOME A COACH
            </h1>
            <p className="text-gray-400 mb-6 text-sm leading-relaxed">
              Help others achieve their fitness goals. As a coach, you can track
              athlete progress, create training programs, and provide guidance.
            </p>
            <button
              onClick={handleRegister}
              disabled={registering}
              className="w-full py-3 px-6 rounded-lg font-bold transition-all disabled:opacity-50"
              style={{
                background: "linear-gradient(180deg, #FF6B6B 0%, #cc5555 100%)",
                boxShadow: "0 4px 0 #992222",
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "10px",
                color: "white",
              }}
            >
              {registering ? "REGISTERING..." : "REGISTER AS COACH"}
            </button>
            <Link
              href="/fitness"
              className="block mt-4 text-gray-500 text-sm hover:text-gray-300"
            >
              Back to Fitness
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Coach dashboard
  return (
    <div className="min-h-screen bg-[#1a1a2e] navbar-offset pb-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-lg mb-1"
              style={{
                fontFamily: "'Press Start 2P', monospace",
                color: "#FFD700",
              }}
            >
              COACH DASHBOARD
            </h1>
            <p className="text-gray-500 text-sm">
              {coachProfile?.business_name || "Manage your athletes"}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/fitness/coach/programs"
              className="flex items-center gap-2 py-2 px-4 rounded-lg transition-all"
              style={{
                background: "linear-gradient(180deg, #5fbf8a 0%, #4aa872 100%)",
                boxShadow: "0 3px 0 #3d8d61",
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "8px",
                color: "white",
              }}
            >
              <BookOpen className="w-4 h-4" />
              PROGRAMS
            </Link>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 py-2 px-4 rounded-lg transition-all"
              style={{
                background: "linear-gradient(180deg, #FF6B6B 0%, #cc5555 100%)",
                boxShadow: "0 3px 0 #992222",
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "8px",
                color: "white",
              }}
            >
              <UserPlus className="w-4 h-4" />
              INVITE
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Athletes"
            value={stats?.total_athletes || 0}
            subtext={`of ${stats?.max_athletes || 10} max`}
            color="#FF6B6B"
          />
          <StatCard
            icon={<Activity className="w-5 h-5" />}
            label="Workouts"
            value={stats?.workouts_this_week || 0}
            subtext="this week"
            color="#5CC9F5"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Compliance"
            value={stats?.compliance_rate != null ? `${stats.compliance_rate}%` : "—"}
            subtext="program adherence"
            color="#5fbf8a"
          />
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label="Pending"
            value={stats?.pending_invites || 0}
            subtext="invites"
            color="#FFD700"
          />
        </div>

        {/* Needing Attention */}
        {needingAttention.length > 0 && (
          <div
            className="mb-6 p-4 rounded-lg"
            style={{
              background: "rgba(255, 107, 107, 0.1)",
              border: "1px solid rgba(255, 107, 107, 0.3)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-[#FF6B6B]" />
              <h2
                className="text-sm"
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  color: "#FF6B6B",
                  fontSize: "10px",
                }}
              >
                NEEDS ATTENTION
              </h2>
            </div>
            <div className="space-y-2">
              {needingAttention.map((item, i) => (
                <Link
                  key={i}
                  href={`/fitness/coach/athletes/${item.athlete.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-black/20 hover:bg-black/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#FF6B6B]/20 flex items-center justify-center text-[#FF6B6B] font-bold text-xs">
                      {(item.athlete.display_name || item.athlete.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">
                        {item.athlete.display_name || item.athlete.email.split("@")[0]}
                      </p>
                      <p className="text-gray-500 text-xs">{item.reason}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <div
            className="mb-6 p-4 rounded-lg"
            style={{
              background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
              border: "1px solid #3d3d4d",
            }}
          >
            <h2
              className="text-sm mb-4"
              style={{
                fontFamily: "'Press Start 2P', monospace",
                color: "#5CC9F5",
                fontSize: "10px",
              }}
            >
              RECENT ACTIVITY
            </h2>
            <div className="space-y-3">
              {recentActivity.slice(0, 5).map((activity, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2 rounded bg-black/20"
                >
                  <div className="w-2 h-2 rounded-full bg-[#5fbf8a]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">
                      <span className="font-medium">
                        {activity.athlete.display_name ||
                          activity.athlete.email.split("@")[0]}
                      </span>{" "}
                      completed a workout
                    </p>
                    <p className="text-gray-500 text-xs">
                      {activity.workout.exercises} exercises •{" "}
                      {formatDuration(activity.workout.duration || 0)} •{" "}
                      +{activity.workout.totalXP} XP
                    </p>
                  </div>
                  <span className="text-gray-500 text-xs whitespace-nowrap">
                    {formatDate(activity.workout.date)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Athletes List */}
        <div
          className="p-4 rounded-lg"
          style={{
            background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
            border: "1px solid #3d3d4d",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-sm"
              style={{
                fontFamily: "'Press Start 2P', monospace",
                color: "#FFD700",
                fontSize: "10px",
              }}
            >
              MY ATHLETES
            </h2>
            <span className="text-gray-500 text-xs">
              {athletes.length} active
            </span>
          </div>

          {athletes.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm mb-4">No athletes yet</p>
              <button
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm"
                style={{
                  background: "rgba(255, 107, 107, 0.2)",
                  border: "1px solid #FF6B6B",
                  color: "#FF6B6B",
                }}
              >
                <Plus className="w-4 h-4" />
                Invite your first athlete
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {athletes.map((athlete) => (
                <Link
                  key={athlete.relationship_id}
                  href={`/fitness/coach/athletes/${athlete.athlete.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-black/20 hover:bg-black/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {athlete.athlete.avatar_url ? (
                      <img
                        src={athlete.athlete.avatar_url}
                        alt=""
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#FF6B6B]/20 flex items-center justify-center text-[#FF6B6B] font-bold">
                        {(
                          athlete.athlete.display_name ||
                          athlete.athlete.email
                        )[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-white font-medium">
                        {athlete.athlete.display_name ||
                          athlete.athlete.email.split("@")[0]}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {athlete.fitness_summary && (
                          <>
                            <span>LVL {athlete.fitness_summary.level}</span>
                            <span>•</span>
                            <span>
                              {athlete.fitness_summary.total_workouts} workouts
                            </span>
                          </>
                        )}
                        {athlete.current_program && (
                          <>
                            <span>•</span>
                            <span className="text-[#5fbf8a]">
                              {athlete.current_program.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {athlete.fitness_summary?.last_workout_date && (
                      <span className="text-gray-500 text-xs">
                        {formatDate(athlete.fitness_summary.last_workout_date)}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link
            href="/fitness"
            className="text-gray-500 text-sm hover:text-gray-300"
          >
            ← Back to Fitness
          </Link>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div
            className="w-full max-w-md p-6 rounded-lg"
            style={{
              background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
              border: "2px solid #3d3d4d",
              boxShadow: "0 4px 0 rgba(0, 0, 0, 0.3)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-sm"
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  color: "#FFD700",
                  fontSize: "10px",
                }}
              >
                INVITE ATHLETE
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInvite}>
              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">
                  Athlete's Email
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="athlete@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/30 border border-gray-600 text-white placeholder-gray-500 focus:border-[#FF6B6B] focus:outline-none"
                    required
                  />
                </div>
                {inviteError && (
                  <p className="mt-2 text-red-400 text-sm">{inviteError}</p>
                )}
              </div>

              <p className="text-gray-500 text-xs mb-4">
                The athlete must have an account on the platform. They will
                receive a notification to accept your coaching invite.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-3 rounded-lg text-gray-400 bg-black/30 border border-gray-600 hover:bg-black/40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail}
                  className="flex-1 py-3 rounded-lg font-bold transition-all disabled:opacity-50"
                  style={{
                    background: "linear-gradient(180deg, #FF6B6B 0%, #cc5555 100%)",
                    boxShadow: "0 3px 0 #992222",
                    color: "white",
                  }}
                >
                  {inviting ? "Sending..." : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({
  icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext: string;
  color: string;
}) {
  return (
    <div
      className="p-4 rounded-lg"
      style={{
        background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
        border: "1px solid #3d3d4d",
      }}
    >
      <div className="flex items-center gap-2 mb-2" style={{ color }}>
        {icon}
        <span
          className="text-xs uppercase"
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "7px" }}
        >
          {label}
        </span>
      </div>
      <p
        className="text-2xl font-bold text-white mb-1"
        style={{ fontFamily: "'Press Start 2P', monospace" }}
      >
        {value}
      </p>
      <p className="text-gray-500 text-xs">{subtext}</p>
    </div>
  );
}
