"use client";

import { LucideIcon } from "lucide-react";

interface AchievementBadgeProps {
  name: string;
  icon: string;
  tier: number;
  unlocked: boolean;
  description?: string;
  onClick?: () => void;
}

const TIER_STYLES = {
  1: "from-amber-700 to-amber-900 border-amber-600", // Bronze
  2: "from-gray-400 to-gray-600 border-gray-300", // Silver
  3: "from-yellow-400 to-yellow-600 border-yellow-300", // Gold
  4: "from-cyan-300 to-purple-400 border-cyan-200", // Platinum
};

const TIER_NAMES = {
  1: "Bronze",
  2: "Silver",
  3: "Gold",
  4: "Platinum",
};

export default function AchievementBadge({
  name,
  icon,
  tier,
  unlocked,
  description,
  onClick,
}: AchievementBadgeProps) {
  const tierStyle = TIER_STYLES[tier as keyof typeof TIER_STYLES] || TIER_STYLES[1];
  const tierName = TIER_NAMES[tier as keyof typeof TIER_NAMES] || "Bronze";

  return (
    <div
      onClick={onClick}
      className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
        unlocked
          ? `bg-gradient-to-br ${tierStyle} cursor-pointer hover:scale-105 hover:shadow-lg`
          : "bg-gray-900/50 border-gray-700 opacity-50"
      } ${onClick ? "cursor-pointer" : ""}`}
      title={description}
    >
      <div className="text-center">
        <div className="text-3xl mb-2">
          {unlocked ? icon : "🔒"}
        </div>
        <div className="text-xs font-medium truncate text-white">{name}</div>
        {unlocked && (
          <div className="text-[10px] text-white/70 mt-1">{tierName}</div>
        )}
      </div>
    </div>
  );
}
