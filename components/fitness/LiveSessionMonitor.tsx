"use client";

import { useState, useEffect } from "react";
import { Activity, Dumbbell, Clock, Zap } from "lucide-react";

interface LiveSession {
  id: string;
  workout_name: string | null;
  started_at: string;
  last_activity: string;
  current_data: {
    currentExercise?: string;
    currentSet?: number;
    totalSets?: number;
    exercisesCompleted?: number;
    totalExercises?: number;
  } | null;
  athlete: {
    id: string;
    display_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export default function LiveSessionMonitor() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
    // Poll every 10 seconds for live updates
    const interval = setInterval(loadSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadSessions = async () => {
    try {
      const res = await fetch("/api/fitness/coach/live-sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error("Error loading live sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (startedAt: string) => {
    const start = new Date(startedAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const mins = Math.floor(diffMs / 60000);

    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs}h ${remainingMins}m`;
  };

  const formatLastActivity = (lastActivity: string) => {
    const last = new Date(lastActivity);
    const now = new Date();
    const diffMs = now.getTime() - last.getTime();
    const secs = Math.floor(diffMs / 1000);

    if (secs < 60) return "Just now";
    const mins = Math.floor(secs / 60);
    if (mins < 5) return `${mins}m ago`;
    return `${mins}m ago`;
  };

  if (loading) {
    return (
      <div
        className="p-4 rounded-lg"
        style={{
          background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
          border: "1px solid #3d3d4d",
        }}
      >
        <div className="text-gray-400 text-sm text-center py-4">Loading...</div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return null; // Don't show anything if no one is training
  }

  return (
    <div
      className="p-4 rounded-lg mb-6"
      style={{
        background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
        border: "2px solid #5fbf8a",
        boxShadow: "0 0 20px rgba(95, 191, 138, 0.2)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative">
          <Activity className="w-5 h-5 text-[#5fbf8a]" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#5fbf8a] rounded-full animate-pulse" />
        </div>
        <h3
          className="text-sm"
          style={{
            fontFamily: "'Press Start 2P', monospace",
            color: "#5fbf8a",
            fontSize: "10px",
          }}
        >
          LIVE NOW
        </h3>
        <span className="ml-auto text-[#5fbf8a] text-xs">
          {sessions.length} athlete{sessions.length !== 1 ? "s" : ""} training
        </span>
      </div>

      {/* Sessions */}
      <div className="space-y-3">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-black/30"
          >
            {/* Avatar with pulse */}
            <div className="relative">
              {session.athlete.avatar_url ? (
                <img
                  src={session.athlete.avatar_url}
                  alt=""
                  className="w-12 h-12 rounded-full ring-2 ring-[#5fbf8a]"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#5fbf8a]/20 flex items-center justify-center text-[#5fbf8a] font-bold ring-2 ring-[#5fbf8a]">
                  {(session.athlete.display_name || session.athlete.email)[0].toUpperCase()}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#5fbf8a] rounded-full border-2 border-[#1f1f2e] animate-pulse" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">
                {session.athlete.display_name || session.athlete.email.split("@")[0]}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                {session.workout_name && (
                  <>
                    <Dumbbell className="w-3 h-3" />
                    <span className="truncate">{session.workout_name}</span>
                    <span className="text-gray-600">•</span>
                  </>
                )}
                <Clock className="w-3 h-3" />
                <span>{formatDuration(session.started_at)}</span>
              </div>

              {/* Progress */}
              {session.current_data && (
                <div className="flex items-center gap-3 mt-1">
                  {session.current_data.currentExercise && (
                    <span className="text-[#5fbf8a] text-xs truncate max-w-[120px]">
                      {session.current_data.currentExercise}
                    </span>
                  )}
                  {session.current_data.exercisesCompleted !== undefined &&
                    session.current_data.totalExercises !== undefined && (
                      <span className="text-gray-500 text-xs">
                        {session.current_data.exercisesCompleted}/
                        {session.current_data.totalExercises} exercises
                      </span>
                    )}
                </div>
              )}
            </div>

            {/* Last Activity */}
            <div className="text-right">
              <div className="flex items-center gap-1 text-[#5fbf8a]">
                <Zap className="w-3 h-3" />
                <span className="text-xs">{formatLastActivity(session.last_activity)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
