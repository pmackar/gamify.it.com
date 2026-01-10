"use client";

import { useState, useEffect } from "react";
import {
  Video,
  Check,
  AlertTriangle,
  Star,
  ChevronLeft,
  ExternalLink,
  Clock,
  User,
} from "lucide-react";

interface FormCheck {
  id: string;
  exercise_name: string;
  video_url: string;
  thumbnail_url: string | null;
  athlete_notes: string | null;
  status: "PENDING" | "REVIEWED" | "APPROVED" | "NEEDS_WORK";
  coach_feedback: string | null;
  rating: number | null;
  created_at: string;
  reviewed_at: string | null;
  athlete: {
    id: string;
    display_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

interface FormCheckReviewProps {
  formCheckId?: string; // If provided, show single form check
  onBack?: () => void;
}

export default function FormCheckReview({ formCheckId, onBack }: FormCheckReviewProps) {
  const [formChecks, setFormChecks] = useState<FormCheck[]>([]);
  const [selectedCheck, setSelectedCheck] = useState<FormCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ pending: 0, reviewed: 0, approved: 0, needs_work: 0 });
  const [filter, setFilter] = useState<string>("pending");

  // Review form state
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [status, setStatus] = useState<"APPROVED" | "NEEDS_WORK">("APPROVED");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (formCheckId) {
      loadSingleFormCheck(formCheckId);
    } else {
      loadFormChecks();
    }
  }, [formCheckId, filter]);

  const loadFormChecks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/fitness/coach/form-checks?status=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setFormChecks(data.formChecks || []);
        setCounts(data.counts || { pending: 0, reviewed: 0, approved: 0, needs_work: 0 });
      }
    } catch (error) {
      console.error("Error loading form checks:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSingleFormCheck = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/fitness/coach/form-checks/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedCheck(data.formCheck);
        setFeedback(data.formCheck.coach_feedback || "");
        setRating(data.formCheck.rating || 0);
      }
    } catch (error) {
      console.error("Error loading form check:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCheck = (check: FormCheck) => {
    setSelectedCheck(check);
    setFeedback(check.coach_feedback || "");
    setRating(check.rating || 0);
  };

  const handleSubmitReview = async () => {
    if (!selectedCheck) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/fitness/coach/form-checks/${selectedCheck.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          feedback,
          rating: rating || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedCheck(data.formCheck);
        // Refresh list if viewing list
        if (!formCheckId) {
          loadFormChecks();
        }
      }
    } catch (error) {
      console.error("Error submitting review:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getStatusBadge = (checkStatus: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      PENDING: { bg: "#FFD700", text: "#1a1a1a", label: "PENDING" },
      REVIEWED: { bg: "#5CC9F5", text: "#1a1a1a", label: "REVIEWED" },
      APPROVED: { bg: "#5fbf8a", text: "#1a1a1a", label: "APPROVED" },
      NEEDS_WORK: { bg: "#FF6B6B", text: "white", label: "NEEDS WORK" },
    };
    const style = styles[checkStatus] || styles.PENDING;
    return (
      <span
        className="px-2 py-0.5 rounded text-[8px] font-bold"
        style={{
          backgroundColor: style.bg,
          color: style.text,
          fontFamily: "'Press Start 2P', monospace",
        }}
      >
        {style.label}
      </span>
    );
  };

  // Single form check view
  if (selectedCheck) {
    return (
      <div className="space-y-4">
        {/* Back button */}
        {!formCheckId && (
          <button
            onClick={() => setSelectedCheck(null)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to list
          </button>
        )}
        {formCheckId && onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        )}

        <div
          className="p-4 rounded-lg"
          style={{
            background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
            border: "1px solid #3d3d4d",
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {selectedCheck.athlete.avatar_url ? (
                <img
                  src={selectedCheck.athlete.avatar_url}
                  alt=""
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#FF6B6B]/20 flex items-center justify-center text-[#FF6B6B] font-bold text-lg">
                  {(selectedCheck.athlete.display_name || selectedCheck.athlete.email)[0].toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-white font-bold">
                  {selectedCheck.athlete.display_name || selectedCheck.athlete.email.split("@")[0]}
                </p>
                <p className="text-gray-400 text-sm">{selectedCheck.exercise_name}</p>
              </div>
            </div>
            {getStatusBadge(selectedCheck.status)}
          </div>

          {/* Video */}
          <div className="mb-4">
            <a
              href={selectedCheck.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 rounded-lg bg-black/30 hover:bg-black/50 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Video className="w-8 h-8 text-[#FF6B6B]" />
                  <div>
                    <p className="text-white font-medium group-hover:text-[#FF6B6B] transition-colors">
                      View Video
                    </p>
                    <p className="text-gray-500 text-xs truncate max-w-[200px]">
                      {selectedCheck.video_url}
                    </p>
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-[#FF6B6B] transition-colors" />
              </div>
            </a>
          </div>

          {/* Athlete Notes */}
          {selectedCheck.athlete_notes && (
            <div className="mb-4 p-3 rounded-lg bg-black/20">
              <p className="text-gray-400 text-xs mb-1">Athlete's Notes:</p>
              <p className="text-gray-200 text-sm">{selectedCheck.athlete_notes}</p>
            </div>
          )}

          {/* Review Form */}
          {selectedCheck.status === "PENDING" && (
            <div className="space-y-4 pt-4 border-t border-gray-700">
              {/* Rating */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Form Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setRating(n)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className="w-8 h-8"
                        fill={n <= rating ? "#FFD700" : "transparent"}
                        color={n <= rating ? "#FFD700" : "#3d3d4d"}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback */}
              <div>
                <label className="block text-gray-400 text-sm mb-1">Feedback</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Provide feedback on their form..."
                  rows={4}
                  className="w-full p-3 rounded-lg bg-black/30 border border-gray-600 text-white placeholder-gray-500 focus:border-[#FF6B6B] focus:outline-none resize-none"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Verdict</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setStatus("APPROVED")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-all ${
                      status === "APPROVED" ? "ring-2 ring-white" : ""
                    }`}
                    style={{
                      background:
                        status === "APPROVED"
                          ? "linear-gradient(180deg, #5fbf8a 0%, #4a9a70 100%)"
                          : "#3d3d4d",
                      color: status === "APPROVED" ? "white" : "#888",
                    }}
                  >
                    <Check className="w-5 h-5" />
                    Approved
                  </button>
                  <button
                    onClick={() => setStatus("NEEDS_WORK")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-all ${
                      status === "NEEDS_WORK" ? "ring-2 ring-white" : ""
                    }`}
                    style={{
                      background:
                        status === "NEEDS_WORK"
                          ? "linear-gradient(180deg, #FF6B6B 0%, #cc5555 100%)"
                          : "#3d3d4d",
                      color: status === "NEEDS_WORK" ? "white" : "#888",
                    }}
                  >
                    <AlertTriangle className="w-5 h-5" />
                    Needs Work
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmitReview}
                disabled={submitting}
                className="w-full py-3 rounded-lg font-bold transition-all disabled:opacity-50"
                style={{
                  background: "linear-gradient(180deg, #FFD700 0%, #E6A000 100%)",
                  boxShadow: "0 3px 0 #996600",
                  color: "#1a1a1a",
                }}
              >
                {submitting ? "SUBMITTING..." : "SUBMIT REVIEW"}
              </button>
            </div>
          )}

          {/* Existing Review */}
          {selectedCheck.status !== "PENDING" && selectedCheck.coach_feedback && (
            <div className="pt-4 border-t border-gray-700">
              <p className="text-gray-400 text-xs mb-2">Your Feedback:</p>
              <p className="text-gray-200 text-sm">{selectedCheck.coach_feedback}</p>
              {selectedCheck.rating && (
                <div className="flex gap-0.5 mt-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className="w-4 h-4"
                      fill={n <= selectedCheck.rating! ? "#FFD700" : "transparent"}
                      color={n <= selectedCheck.rating! ? "#FFD700" : "#3d3d4d"}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-700 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(selectedCheck.created_at)}
            </div>
            {selectedCheck.reviewed_at && (
              <div className="flex items-center gap-1">
                <Check className="w-3 h-3" />
                Reviewed {formatDate(selectedCheck.reviewed_at)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // List view
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
        <div className="flex items-center gap-2 mb-3">
          <Video className="w-5 h-5 text-[#FF6B6B]" />
          <h3
            className="text-sm"
            style={{
              fontFamily: "'Press Start 2P', monospace",
              color: "#FF6B6B",
              fontSize: "10px",
            }}
          >
            FORM CHECKS
          </h3>
          {counts.pending > 0 && (
            <span className="ml-auto px-2 py-0.5 rounded-full bg-[#FFD700] text-[#1a1a1a] text-xs font-bold">
              {counts.pending}
            </span>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto">
          {[
            { id: "pending", label: "Pending", count: counts.pending },
            { id: "approved", label: "Approved", count: counts.approved },
            { id: "needs_work", label: "Needs Work", count: counts.needs_work },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                filter === f.id
                  ? "bg-[#FF6B6B]/20 text-[#FF6B6B]"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {f.label}
              {f.count > 0 && <span className="ml-1 opacity-60">({f.count})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-sm">Loading...</div>
          </div>
        ) : formChecks.length === 0 ? (
          <div className="text-center py-8">
            <Video className="w-12 h-12 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No form checks</p>
            <p className="text-gray-500 text-xs mt-1">
              {filter === "pending"
                ? "No pending reviews"
                : `No ${filter.replace("_", " ")} form checks`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {formChecks.map((check) => (
              <button
                key={check.id}
                onClick={() => handleSelectCheck(check)}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-black/20 hover:bg-black/30 transition-colors text-left"
              >
                {check.athlete.avatar_url ? (
                  <img
                    src={check.athlete.avatar_url}
                    alt=""
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#FF6B6B]/20 flex items-center justify-center text-[#FF6B6B] font-bold">
                    {(check.athlete.display_name || check.athlete.email)[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">
                    {check.athlete.display_name || check.athlete.email.split("@")[0]}
                  </p>
                  <p className="text-gray-400 text-sm">{check.exercise_name}</p>
                </div>
                <div className="text-right">
                  {getStatusBadge(check.status)}
                  <p className="text-gray-500 text-xs mt-1">{formatDate(check.created_at)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
