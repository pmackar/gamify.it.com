"use client";

import { useState } from "react";
import { Video, Send, X, Link as LinkIcon, CheckCircle, AlertCircle } from "lucide-react";

interface FormCheckSubmitProps {
  onSubmit?: () => void;
  onClose?: () => void;
}

export default function FormCheckSubmit({ onSubmit, onClose }: FormCheckSubmitProps) {
  const [exerciseName, setExerciseName] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const isYouTubeUrl = (url: string) => {
    return url.includes("youtube.com") || url.includes("youtu.be");
  };

  const handleSubmit = async () => {
    setError("");

    if (!exerciseName.trim()) {
      setError("Please enter an exercise name");
      return;
    }

    if (!videoUrl.trim()) {
      setError("Please enter a video URL");
      return;
    }

    if (!isValidUrl(videoUrl)) {
      setError("Please enter a valid URL");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/fitness/athlete/form-checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseName,
          videoUrl,
          notes,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          onSubmit?.();
          onClose?.();
        }, 1500);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to submit form check");
      }
    } catch {
      setError("Failed to submit form check");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div
        className="p-6 rounded-lg text-center"
        style={{
          background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
          border: "2px solid #5fbf8a",
        }}
      >
        <CheckCircle className="w-16 h-16 text-[#5fbf8a] mx-auto mb-4" />
        <h3
          className="text-sm mb-2"
          style={{
            fontFamily: "'Press Start 2P', monospace",
            color: "#5fbf8a",
            fontSize: "10px",
          }}
        >
          SUBMITTED!
        </h3>
        <p className="text-gray-400 text-sm">
          Your coach will review your form soon.
        </p>
      </div>
    );
  }

  return (
    <div
      className="p-6 rounded-lg"
      style={{
        background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
        border: "2px solid #3d3d4d",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Video className="w-6 h-6 text-[#FF6B6B]" />
          <h3
            className="text-sm"
            style={{
              fontFamily: "'Press Start 2P', monospace",
              color: "#FF6B6B",
              fontSize: "10px",
            }}
          >
            FORM CHECK
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Exercise Name */}
        <div>
          <label className="block text-gray-400 text-sm mb-1">
            Exercise <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={exerciseName}
            onChange={(e) => setExerciseName(e.target.value)}
            placeholder="e.g., Squat, Deadlift, Bench Press"
            className="w-full p-3 rounded-lg bg-black/30 border border-gray-600 text-white placeholder-gray-500 focus:border-[#FF6B6B] focus:outline-none"
          />
        </div>

        {/* Video URL */}
        <div>
          <label className="block text-gray-400 text-sm mb-1">
            Video URL <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... or any video URL"
              className="w-full p-3 pl-10 rounded-lg bg-black/30 border border-gray-600 text-white placeholder-gray-500 focus:border-[#FF6B6B] focus:outline-none"
            />
          </div>
          <p className="text-gray-500 text-xs mt-1">
            Upload to YouTube (unlisted) or any video hosting service
          </p>
          {videoUrl && isValidUrl(videoUrl) && (
            <div className="mt-2 p-2 rounded bg-black/20 flex items-center gap-2">
              {isYouTubeUrl(videoUrl) ? (
                <span className="text-red-500 text-xs">YouTube</span>
              ) : (
                <span className="text-blue-400 text-xs">External</span>
              )}
              <span className="text-gray-400 text-xs truncate flex-1">{videoUrl}</span>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-gray-400 text-sm mb-1">
            Notes for Coach (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any specific concerns or questions about your form?"
            rows={3}
            className="w-full p-3 rounded-lg bg-black/30 border border-gray-600 text-white placeholder-gray-500 focus:border-[#FF6B6B] focus:outline-none resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !exerciseName.trim() || !videoUrl.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all disabled:opacity-50"
          style={{
            background: "linear-gradient(180deg, #FF6B6B 0%, #cc5555 100%)",
            boxShadow: "0 3px 0 #992222",
            color: "white",
          }}
        >
          <Send className="w-4 h-4" />
          {submitting ? "SUBMITTING..." : "SUBMIT FOR REVIEW"}
        </button>
      </div>

      {/* Tips */}
      <div className="mt-6 p-3 rounded-lg bg-black/20">
        <p className="text-gray-400 text-xs font-bold mb-2">TIPS FOR GOOD FORM VIDEOS:</p>
        <ul className="text-gray-500 text-xs space-y-1">
          <li>• Film from a 45° angle to show depth and bar path</li>
          <li>• Include at least 2-3 reps</li>
          <li>• Use good lighting</li>
          <li>• Keep the full movement in frame</li>
        </ul>
      </div>
    </div>
  );
}
