"use client";

import { useState, useEffect } from "react";
import { Trophy, TrendingUp, Flame, Dumbbell, Target, ChevronDown } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  athleteId: string;
  displayName: string | null;
  avatarUrl: string | null;
  value: number;
  unit: string;
}

interface Group {
  id: string;
  name: string;
  color: string | null;
}

type MetricType = "compliance" | "xp" | "streak" | "workouts" | "volume";
type PeriodType = "week" | "month" | "all";

const METRICS: { id: MetricType; label: string; icon: typeof Trophy }[] = [
  { id: "compliance", label: "Compliance", icon: Target },
  { id: "xp", label: "XP", icon: TrendingUp },
  { id: "streak", label: "Streak", icon: Flame },
  { id: "workouts", label: "Workouts", icon: Dumbbell },
  { id: "volume", label: "Volume", icon: Trophy },
];

const PERIODS: { id: PeriodType; label: string }[] = [
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "all", label: "All Time" },
];

export default function Leaderboards() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<MetricType>("compliance");
  const [period, setPeriod] = useState<PeriodType>("week");
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showMetricDropdown, setShowMetricDropdown] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [metric, period, selectedGroup]);

  const loadGroups = async () => {
    try {
      const res = await fetch("/api/fitness/coach/groups");
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error("Error loading groups:", error);
    }
  };

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        metric,
        period,
        ...(selectedGroup ? { groupId: selectedGroup } : {}),
      });
      const res = await fetch(`/api/fitness/coach/leaderboards?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.leaderboard || []);
      }
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === "lbs" && value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    if (unit === "XP" && value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toLocaleString();
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          bg: "linear-gradient(180deg, #FFD700 0%, #E6A000 100%)",
          shadow: "0 2px 0 #996600",
          color: "#1a1a1a",
        };
      case 2:
        return {
          bg: "linear-gradient(180deg, #C0C0C0 0%, #A0A0A0 100%)",
          shadow: "0 2px 0 #707070",
          color: "#1a1a1a",
        };
      case 3:
        return {
          bg: "linear-gradient(180deg, #CD7F32 0%, #A56120 100%)",
          shadow: "0 2px 0 #7a4513",
          color: "#1a1a1a",
        };
      default:
        return {
          bg: "#3d3d4d",
          shadow: "none",
          color: "white",
        };
    }
  };

  const currentMetric = METRICS.find((m) => m.id === metric);
  const MetricIcon = currentMetric?.icon || Trophy;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
        border: "1px solid #3d3d4d",
      }}
    >
      {/* Header */}
      <div className="p-4 border-b border-[#3d3d4d]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#FFD700]" />
            <h3
              className="text-sm"
              style={{
                fontFamily: "'Press Start 2P', monospace",
                color: "#FFD700",
                fontSize: "10px",
              }}
            >
              LEADERBOARD
            </h3>
          </div>

          {/* Metric Selector */}
          <div className="relative">
            <button
              onClick={() => setShowMetricDropdown(!showMetricDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/30 text-gray-300 text-sm hover:bg-black/50 transition-colors"
            >
              <MetricIcon className="w-4 h-4" />
              {currentMetric?.label}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showMetricDropdown && (
              <div
                className="absolute right-0 top-full mt-1 z-20 rounded-lg overflow-hidden min-w-[140px]"
                style={{
                  background: "#2d2d3d",
                  border: "1px solid #3d3d4d",
                }}
              >
                {METRICS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setMetric(m.id);
                      setShowMetricDropdown(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-white/10 transition-colors ${
                      metric === m.id ? "text-[#4ECDC4]" : "text-gray-300"
                    }`}
                  >
                    <m.icon className="w-4 h-4" />
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Period Tabs */}
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                period === p.id
                  ? "bg-[#4ECDC4]/20 text-[#4ECDC4]"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Group Filter */}
        {groups.length > 0 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedGroup(null)}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
                selectedGroup === null
                  ? "bg-[#4ECDC4]/20 text-[#4ECDC4]"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              All Athletes
            </button>
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGroup(g.id)}
                className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
                  selectedGroup === g.id
                    ? "text-white"
                    : "text-gray-500 hover:text-gray-300"
                }`}
                style={{
                  backgroundColor:
                    selectedGroup === g.id ? `${g.color || "#4ECDC4"}33` : undefined,
                  color: selectedGroup === g.id ? g.color || "#4ECDC4" : undefined,
                }}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Leaderboard List */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-sm">Loading...</div>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No data available</p>
            <p className="text-gray-500 text-xs mt-1">
              Athletes will appear once they start tracking
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => {
              const rankStyle = getRankStyle(entry.rank);
              return (
                <div
                  key={entry.athleteId}
                  className="flex items-center gap-3 p-3 rounded-lg bg-black/20"
                >
                  {/* Rank Badge */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
                    style={{
                      background: rankStyle.bg,
                      boxShadow: rankStyle.shadow,
                      color: rankStyle.color,
                    }}
                  >
                    {entry.rank}
                  </div>

                  {/* Avatar */}
                  {entry.avatarUrl ? (
                    <img
                      src={entry.avatarUrl}
                      alt=""
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold">
                      {(entry.displayName || "?")[0].toUpperCase()}
                    </div>
                  )}

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {entry.displayName || "Unknown"}
                    </p>
                  </div>

                  {/* Value */}
                  <div className="text-right">
                    <p
                      className="font-bold"
                      style={{
                        color: entry.rank <= 3 ? "#FFD700" : "#4ECDC4",
                        fontFamily: "'Press Start 2P', monospace",
                        fontSize: "10px",
                      }}
                    >
                      {formatValue(entry.value, entry.unit)}
                    </p>
                    <p className="text-gray-500 text-xs">{entry.unit}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
