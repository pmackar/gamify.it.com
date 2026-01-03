"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Dumbbell,
  Trophy,
  TrendingUp,
  Calendar,
  Clock,
  Target,
  MoreVertical,
  Trash2,
  Edit,
  MessageSquare,
} from "lucide-react";

interface AthleteData {
  relationship: {
    id: string;
    status: string;
    invited_at: string;
    accepted_at: string | null;
    coach_notes: string | null;
  };
  athlete: {
    id: string;
    email: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    main_level: number | null;
    total_xp: number | null;
    created_at: string;
  };
  current_assignment: any | null;
  assignments: any[];
  fitness_data: {
    profile: {
      name: string;
      level: number;
      xp: number;
      totalWorkouts: number;
      totalSets: number;
      totalVolume: number;
    } | null;
    records: Record<string, number>;
    total_workouts: number;
    recent_workouts: any[];
    achievements: string[];
  } | null;
  compliance_rate: number | null;
}

export default function AthleteDetailPage({
  params,
}: {
  params: Promise<{ athleteId: string }>;
}) {
  const { athleteId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AthleteData | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    loadAthlete();
  }, [athleteId]);

  const loadAthlete = async () => {
    try {
      const res = await fetch(`/api/fitness/coach/athletes/${athleteId}`);
      if (res.ok) {
        const athleteData = await res.json();
        setData(athleteData);
        setNotes(athleteData.relationship.coach_notes || "");
      } else if (res.status === 404) {
        router.push("/fitness/coach");
      }
    } catch (error) {
      console.error("Error loading athlete:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAthlete = async () => {
    if (!confirm("Are you sure you want to end coaching this athlete?")) return;

    try {
      const res = await fetch(`/api/fitness/coach/athletes/${athleteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/fitness/coach");
      }
    } catch (error) {
      console.error("Error removing athlete:", error);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/fitness/coach/athletes/${athleteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coach_notes: notes }),
      });
      if (res.ok) {
        setShowNotesModal(false);
        loadAthlete();
      }
    } catch (error) {
      console.error("Error saving notes:", error);
    } finally {
      setSavingNotes(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs}h ${remainingMins}m`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(0)}K`;
    return volume.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <div className="text-center">
          <Dumbbell className="w-12 h-12 text-[#FF6B6B] animate-pulse mx-auto mb-4" />
          <p className="text-gray-400 font-mono text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] navbar-offset px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-400">Athlete not found</p>
          <Link href="/fitness/coach" className="text-[#FF6B6B] mt-4 block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { athlete, fitness_data, relationship, compliance_rate } = data;
  const profile = fitness_data?.profile;
  const records = fitness_data?.records || {};
  const recentWorkouts = fitness_data?.recent_workouts || [];

  // Get top PRs
  const topPRs = Object.entries(records)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  return (
    <div className="min-h-screen bg-[#1a1a2e] navbar-offset pb-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/fitness/coach"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </Link>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-gray-400" />
            </button>
            {showMenu && (
              <div
                className="absolute right-0 top-full mt-2 w-48 rounded-lg overflow-hidden z-10"
                style={{
                  background: "#2d2d3d",
                  border: "1px solid #3d3d4d",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                }}
              >
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowNotesModal(true);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-left text-gray-300 hover:bg-white/10 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Edit Notes
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    handleRemoveAthlete();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-left text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove Athlete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Athlete Profile Card */}
        <div
          className="p-6 rounded-lg mb-6"
          style={{
            background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
            border: "1px solid #3d3d4d",
          }}
        >
          <div className="flex items-start gap-4">
            {athlete.avatar_url ? (
              <img
                src={athlete.avatar_url}
                alt=""
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#FF6B6B]/20 flex items-center justify-center text-[#FF6B6B] font-bold text-xl">
                {(athlete.display_name || athlete.email)[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white mb-1">
                {athlete.display_name || athlete.email.split("@")[0]}
              </h1>
              <p className="text-gray-500 text-sm mb-3">{athlete.email}</p>
              <div className="flex flex-wrap gap-3">
                <span
                  className="px-3 py-1 rounded-full text-xs"
                  style={{
                    background: "linear-gradient(180deg, #FFD700 0%, #E6A000 100%)",
                    color: "#1a1a1a",
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: "8px",
                  }}
                >
                  LVL {profile?.level || athlete.main_level || 1}
                </span>
                <span className="px-3 py-1 rounded-full bg-white/10 text-gray-300 text-xs">
                  {profile?.totalWorkouts || fitness_data?.total_workouts || 0} workouts
                </span>
                {compliance_rate !== null && (
                  <span
                    className="px-3 py-1 rounded-full text-xs"
                    style={{
                      background:
                        compliance_rate >= 80
                          ? "rgba(95, 191, 138, 0.2)"
                          : compliance_rate >= 50
                          ? "rgba(255, 215, 0, 0.2)"
                          : "rgba(255, 107, 107, 0.2)",
                      color:
                        compliance_rate >= 80
                          ? "#5fbf8a"
                          : compliance_rate >= 50
                          ? "#FFD700"
                          : "#FF6B6B",
                    }}
                  >
                    {compliance_rate}% compliance
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-700">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">
                {formatVolume(profile?.totalVolume || 0)}
              </p>
              <p className="text-gray-500 text-xs">Total Volume (lbs)</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">
                {profile?.totalSets || 0}
              </p>
              <p className="text-gray-500 text-xs">Total Sets</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">
                {fitness_data?.achievements?.length || 0}
              </p>
              <p className="text-gray-500 text-xs">Achievements</p>
            </div>
          </div>
        </div>

        {/* Coach Notes */}
        {relationship.coach_notes && (
          <div
            className="p-4 rounded-lg mb-6"
            style={{
              background: "rgba(255, 215, 0, 0.1)",
              border: "1px solid rgba(255, 215, 0, 0.3)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-[#FFD700]" />
              <span
                className="text-xs"
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  color: "#FFD700",
                  fontSize: "8px",
                }}
              >
                YOUR NOTES
              </span>
            </div>
            <p className="text-gray-300 text-sm whitespace-pre-wrap">
              {relationship.coach_notes}
            </p>
          </div>
        )}

        {/* Personal Records */}
        {topPRs.length > 0 && (
          <div
            className="p-4 rounded-lg mb-6"
            style={{
              background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
              border: "1px solid #3d3d4d",
            }}
          >
            <h2
              className="text-sm mb-4"
              style={{
                fontFamily: "'Press Start 2P', monospace",
                color: "#FFD700",
                fontSize: "10px",
              }}
            >
              PERSONAL RECORDS
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {topPRs.map(([exercise, weight]) => (
                <div
                  key={exercise}
                  className="p-3 rounded-lg bg-black/20 flex items-center gap-3"
                >
                  <Trophy className="w-4 h-4 text-[#FFD700]" />
                  <div>
                    <p className="text-white font-medium text-sm capitalize">
                      {exercise.replace(/_/g, " ")}
                    </p>
                    <p className="text-[#FFD700] text-xs font-bold">
                      {weight} lbs
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Workouts */}
        <div
          className="p-4 rounded-lg"
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
            RECENT WORKOUTS
          </h2>

          {recentWorkouts.length === 0 ? (
            <div className="text-center py-8">
              <Dumbbell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No workouts logged yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentWorkouts.map((workout: any, i: number) => (
                <div
                  key={workout.id || i}
                  className="p-4 rounded-lg bg-black/20"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-white text-sm">
                        {formatDate(workout.endTime || workout.startTime)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {workout.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(workout.duration)}
                        </span>
                      )}
                      <span className="text-[#FFD700]">+{workout.totalXP} XP</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {workout.exercises?.slice(0, 5).map((ex: any, j: number) => (
                      <span
                        key={j}
                        className="px-2 py-1 rounded bg-white/5 text-gray-400 text-xs"
                      >
                        {ex.name}
                      </span>
                    ))}
                    {workout.exercises?.length > 5 && (
                      <span className="px-2 py-1 text-gray-500 text-xs">
                        +{workout.exercises.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div
            className="w-full max-w-md p-6 rounded-lg"
            style={{
              background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
              border: "2px solid #3d3d4d",
              boxShadow: "0 4px 0 rgba(0, 0, 0, 0.3)",
            }}
          >
            <h3
              className="text-sm mb-4"
              style={{
                fontFamily: "'Press Start 2P', monospace",
                color: "#FFD700",
                fontSize: "10px",
              }}
            >
              COACH NOTES
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add private notes about this athlete..."
              rows={5}
              className="w-full p-3 rounded-lg bg-black/30 border border-gray-600 text-white placeholder-gray-500 focus:border-[#FFD700] focus:outline-none resize-none"
            />
            <p className="text-gray-500 text-xs mt-2 mb-4">
              Only you can see these notes.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowNotesModal(false)}
                className="flex-1 py-3 rounded-lg text-gray-400 bg-black/30 border border-gray-600 hover:bg-black/40 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="flex-1 py-3 rounded-lg font-bold transition-all disabled:opacity-50"
                style={{
                  background: "linear-gradient(180deg, #FFD700 0%, #E6A000 100%)",
                  boxShadow: "0 3px 0 #996600",
                  color: "#1a1a1a",
                }}
              >
                {savingNotes ? "Saving..." : "Save Notes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
