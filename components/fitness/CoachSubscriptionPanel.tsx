"use client";

import { useState, useEffect } from "react";
import {
  Users,
  FileVideo,
  FolderKanban,
  Crown,
  Zap,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

interface UsageData {
  usage: {
    period: { start: string; end: string };
    current: {
      athletes: number;
      formChecks: number;
      messages: number;
      programs: number;
    };
    limits: {
      maxAthletes: number;
      formChecksPerMonth: number;
      programsLimit: number;
    };
    percentages: {
      athletes: number;
      formChecks: number;
      programs: number;
    };
  };
  tier: string;
  upgradeRecommendation: {
    shouldUpgrade: boolean;
    reason: string;
    recommendedTier: string;
  } | null;
}

const TIER_COLORS: Record<string, string> = {
  FREE: "#9ca3af",
  PREMIUM: "#60a5fa",
  COACH: "#5fbf8a",
  PRO: "#f0a85f",
};

const TIER_NAMES: Record<string, string> = {
  FREE: "Free Trial",
  PREMIUM: "Premium",
  COACH: "Coach",
  PRO: "Pro",
};

export default function CoachSubscriptionPanel() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      const res = await fetch("/api/fitness/coach/usage");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error("Error loading usage:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        className="p-4 rounded-lg animate-pulse"
        style={{
          background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
          border: "1px solid #3d3d4d",
        }}
      >
        <div className="h-4 bg-gray-700 rounded w-24 mb-2" />
        <div className="h-3 bg-gray-700 rounded w-32" />
      </div>
    );
  }

  if (!data) return null;

  const { usage, tier, upgradeRecommendation } = data;
  const tierColor = TIER_COLORS[tier] || TIER_COLORS.FREE;

  const formatLimit = (limit: number) => (limit === -1 ? "∞" : limit.toString());

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "#ef4444";
    if (percentage >= 75) return "#f0a85f";
    return "#5fbf8a";
  };

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%)",
        border: `1px solid ${tierColor}40`,
      }}
    >
      {/* Header - Always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: `${tierColor}20` }}
          >
            <Crown className="w-5 h-5" style={{ color: tierColor }} />
          </div>
          <div className="text-left">
            <p
              className="font-medium"
              style={{ color: tierColor }}
            >
              {TIER_NAMES[tier] || tier} Plan
            </p>
            <p className="text-xs text-gray-400">
              {usage.current.athletes}/{formatLimit(usage.limits.maxAthletes)} athletes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {upgradeRecommendation && (
            <span className="px-2 py-1 rounded-full bg-[#f0a85f]/20 text-[#f0a85f] text-xs">
              Upgrade
            </span>
          )}
          <ChevronRight
            className={`w-5 h-5 text-gray-400 transition-transform ${
              expanded ? "rotate-90" : ""
            }`}
          />
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Upgrade Alert */}
          {upgradeRecommendation && (
            <div
              className="p-3 rounded-lg flex items-start gap-3"
              style={{
                background: "rgba(240, 168, 95, 0.1)",
                border: "1px solid rgba(240, 168, 95, 0.3)",
              }}
            >
              <TrendingUp className="w-5 h-5 text-[#f0a85f] mt-0.5" />
              <div>
                <p className="text-sm text-[#f0a85f] font-medium">
                  Consider upgrading to {TIER_NAMES[upgradeRecommendation.recommendedTier]}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {upgradeRecommendation.reason}
                </p>
              </div>
            </div>
          )}

          {/* Usage Meters */}
          <div className="space-y-3">
            {/* Athletes */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Users className="w-4 h-4" />
                  <span>Athletes</span>
                </div>
                <span className="text-sm text-gray-400">
                  {usage.current.athletes}/{formatLimit(usage.limits.maxAthletes)}
                </span>
              </div>
              <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(usage.percentages.athletes, 100)}%`,
                    background: getProgressColor(usage.percentages.athletes),
                  }}
                />
              </div>
            </div>

            {/* Form Checks */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <FileVideo className="w-4 h-4" />
                  <span>Form Checks (this month)</span>
                </div>
                <span className="text-sm text-gray-400">
                  {usage.current.formChecks}/{formatLimit(usage.limits.formChecksPerMonth)}
                </span>
              </div>
              <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(usage.percentages.formChecks, 100)}%`,
                    background: getProgressColor(usage.percentages.formChecks),
                  }}
                />
              </div>
            </div>

            {/* Programs */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <FolderKanban className="w-4 h-4" />
                  <span>Programs</span>
                </div>
                <span className="text-sm text-gray-400">
                  {usage.current.programs}/{formatLimit(usage.limits.programsLimit)}
                </span>
              </div>
              <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(usage.percentages.programs, 100)}%`,
                    background: getProgressColor(usage.percentages.programs),
                  }}
                />
              </div>
            </div>
          </div>

          {/* Billing Period */}
          <p className="text-xs text-gray-500 text-center">
            Billing period: {new Date(usage.period.start).toLocaleDateString()} -{" "}
            {new Date(usage.period.end).toLocaleDateString()}
          </p>

          {/* Upgrade Button */}
          {tier !== "PRO" && (
            <button
              onClick={() => {
                // TODO: Open upgrade modal or navigate to pricing page
                alert("Upgrade flow coming soon!");
              }}
              className="w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all hover:opacity-90"
              style={{
                background: `linear-gradient(180deg, ${tierColor} 0%, ${tierColor}cc 100%)`,
                color: "#1a1a2e",
              }}
            >
              <Zap className="w-4 h-4" />
              Upgrade Plan
            </button>
          )}

          {/* Limit Warnings */}
          {(usage.percentages.athletes >= 90 || usage.percentages.formChecks >= 90) && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
              <p className="text-xs text-red-400">
                You're approaching your plan limits. Consider upgrading to avoid interruptions.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
