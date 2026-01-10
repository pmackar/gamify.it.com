"use client";

import { useState } from "react";
import { X, Users, Clock, CalendarDays, AlertCircle, Check } from "lucide-react";

interface ProgramPropagateModalProps {
  programId: string;
  programName: string;
  athleteCount: number;
  onClose: () => void;
  onSuccess: () => void;
}

type PropagationMode = "immediate" | "next_week" | "new_assignments_only";

export default function ProgramPropagateModal({
  programId,
  programName,
  athleteCount,
  onClose,
  onSuccess,
}: ProgramPropagateModalProps) {
  const [mode, setMode] = useState<PropagationMode>("immediate");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handlePropagate = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/fitness/coach/programs/${programId}/propagate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, notes: notes.trim() || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to propagate updates");
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const modeOptions = [
    {
      value: "immediate" as const,
      icon: Clock,
      label: "Apply Immediately",
      description: "Athletes see changes right away, including current week",
      color: "#5fbf8a",
    },
    {
      value: "next_week" as const,
      icon: CalendarDays,
      label: "Apply Next Week",
      description: "Changes take effect when athletes advance to next week",
      color: "#f0a85f",
    },
    {
      value: "new_assignments_only" as const,
      icon: Users,
      label: "New Assignments Only",
      description: "Only future athletes will get this version",
      color: "#8b5cf6",
    },
  ];

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div
          className="w-full max-w-md rounded-lg p-8 text-center"
          style={{
            background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
            border: "2px solid #5fbf8a",
          }}
        >
          <div className="w-16 h-16 rounded-full bg-[#5fbf8a]/20 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-[#5fbf8a]" />
          </div>
          <h3
            className="text-lg mb-2"
            style={{ fontFamily: "'Press Start 2P', monospace", color: "#5fbf8a" }}
          >
            Update Pushed!
          </h3>
          <p className="text-gray-400">
            {mode === "immediate"
              ? `${athleteCount} athlete(s) have been notified`
              : mode === "next_week"
                ? `${athleteCount} athlete(s) will see changes next week`
                : "New version saved for future assignments"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div
        className="w-full max-w-lg rounded-lg overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
          border: "1px solid #3d3d4d",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#3d3d4d]">
          <h2
            className="text-sm"
            style={{ fontFamily: "'Press Start 2P', monospace", color: "#f0a85f" }}
          >
            Push Program Update
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Program Info */}
          <div className="p-3 rounded-lg bg-black/30">
            <p className="text-white font-medium">{programName}</p>
            <p className="text-sm text-gray-400">
              {athleteCount} athlete{athleteCount !== 1 ? "s" : ""} currently assigned
            </p>
          </div>

          {/* Mode Selection */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              How should this update be applied?
            </label>
            <div className="space-y-2">
              {modeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setMode(option.value)}
                  className="w-full p-3 rounded-lg text-left transition-all"
                  style={{
                    background: mode === option.value ? `${option.color}20` : "transparent",
                    border: `2px solid ${mode === option.value ? option.color : "#3d3d4d"}`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <option.icon
                      className="w-5 h-5 mt-0.5"
                      style={{ color: option.color }}
                    />
                    <div>
                      <p
                        className="font-medium"
                        style={{ color: mode === option.value ? option.color : "white" }}
                      >
                        {option.label}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{option.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Update notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Added deload week, adjusted rep ranges..."
              className="w-full p-3 rounded-lg bg-black/30 text-white border border-[#3d3d4d] focus:border-[#f0a85f] focus:outline-none resize-none"
              rows={2}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/20 border border-red-500/40">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-[#3d3d4d]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-gray-400 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePropagate}
            disabled={loading}
            className="px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
            style={{
              background: "linear-gradient(180deg, #5fbf8a 0%, #4a9d70 100%)",
              color: "#1a1a2e",
            }}
          >
            {loading ? "Pushing..." : "Push Update"}
          </button>
        </div>
      </div>
    </div>
  );
}
