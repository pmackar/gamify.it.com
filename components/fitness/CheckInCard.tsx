"use client";

import { useState } from "react";
import { ClipboardCheck, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";

interface CheckIn {
  id: string;
  week_of: string;
  energy_level: number | null;
  sleep_quality: number | null;
  stress_level: number | null;
  soreness_level: number | null;
  motivation: number | null;
  wins: string | null;
  challenges: string | null;
  questions: string | null;
  coach_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  athlete: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    email: string;
  };
}

interface CheckInCardProps {
  checkIn: CheckIn;
  onReview?: (id: string, notes: string) => Promise<void>;
}

const METRIC_LABELS: Record<string, string> = {
  energy_level: "Energy",
  sleep_quality: "Sleep",
  stress_level: "Stress",
  soreness_level: "Soreness",
  motivation: "Motivation",
};

const METRIC_COLORS: Record<number, string> = {
  1: "#FF6B6B",
  2: "#F39C12",
  3: "#FFD700",
  4: "#5fbf8a",
  5: "#4ECDC4",
};

export default function CheckInCard({ checkIn, onReview }: CheckInCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [coachNotes, setCoachNotes] = useState(checkIn.coach_notes || "");
  const [saving, setSaving] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const handleSaveNotes = async () => {
    if (!onReview) return;
    setSaving(true);
    try {
      await onReview(checkIn.id, coachNotes);
    } finally {
      setSaving(false);
    }
  };

  const metrics = [
    { key: "energy_level", value: checkIn.energy_level },
    { key: "sleep_quality", value: checkIn.sleep_quality },
    { key: "stress_level", value: checkIn.stress_level },
    { key: "soreness_level", value: checkIn.soreness_level },
    { key: "motivation", value: checkIn.motivation },
  ].filter((m) => m.value !== null);

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
        border: `1px solid ${checkIn.reviewed_at ? "#3d3d4d" : "#4ECDC4"}`,
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          {checkIn.athlete.avatar_url ? (
            <img
              src={checkIn.athlete.avatar_url}
              alt=""
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#4ECDC4]/20 flex items-center justify-center text-[#4ECDC4] font-bold">
              {(checkIn.athlete.display_name || checkIn.athlete.email)[0].toUpperCase()}
            </div>
          )}
          <div className="text-left">
            <p className="text-white font-medium">
              {checkIn.athlete.display_name || checkIn.athlete.email.split("@")[0]}
            </p>
            <p className="text-gray-500 text-xs">
              Week of {formatDate(checkIn.week_of)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!checkIn.reviewed_at && (
            <span
              className="px-2 py-1 rounded text-[8px] uppercase"
              style={{
                background: "linear-gradient(180deg, #4ECDC4 0%, #3db3ab 100%)",
                fontFamily: "'Press Start 2P', monospace",
                color: "white",
              }}
            >
              New
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-700/50">
          {/* Metrics */}
          <div className="flex flex-wrap gap-3 mt-4">
            {metrics.map(({ key, value }) => (
              <div
                key={key}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/30"
              >
                <span className="text-gray-400 text-xs">{METRIC_LABELS[key]}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div
                      key={n}
                      className="w-3 h-3 rounded-sm"
                      style={{
                        backgroundColor:
                          n <= (value || 0) ? METRIC_COLORS[value || 1] : "#3d3d4d",
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Text responses */}
          <div className="mt-4 space-y-3">
            {checkIn.wins && (
              <div>
                <p className="text-gray-400 text-xs mb-1">Wins this week</p>
                <p className="text-gray-200 text-sm bg-black/20 p-3 rounded-lg">
                  {checkIn.wins}
                </p>
              </div>
            )}
            {checkIn.challenges && (
              <div>
                <p className="text-gray-400 text-xs mb-1">Challenges</p>
                <p className="text-gray-200 text-sm bg-black/20 p-3 rounded-lg">
                  {checkIn.challenges}
                </p>
              </div>
            )}
            {checkIn.questions && (
              <div>
                <p className="text-gray-400 text-xs mb-1">Questions for coach</p>
                <p className="text-gray-200 text-sm bg-black/20 p-3 rounded-lg">
                  {checkIn.questions}
                </p>
              </div>
            )}
          </div>

          {/* Coach notes */}
          {onReview && (
            <div className="mt-4 pt-4 border-t border-gray-700/50">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-[#FFD700]" />
                <span className="text-[#FFD700] text-xs font-bold">Coach Notes</span>
              </div>
              <textarea
                value={coachNotes}
                onChange={(e) => setCoachNotes(e.target.value)}
                placeholder="Add notes or feedback for this athlete..."
                rows={3}
                className="w-full p-3 rounded-lg bg-black/30 border border-gray-600 text-white placeholder-gray-500 focus:border-[#FFD700] focus:outline-none resize-none text-sm"
              />
              <button
                onClick={handleSaveNotes}
                disabled={saving}
                className="mt-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                style={{
                  background: "linear-gradient(180deg, #FFD700 0%, #E6A000 100%)",
                  boxShadow: "0 2px 0 #996600",
                  color: "#1a1a1a",
                }}
              >
                {saving ? "Saving..." : checkIn.reviewed_at ? "Update Notes" : "Mark Reviewed"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
