"use client";

interface XPBarProps {
  level: number;
  currentXP: number;
  xpToNext: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function XPBar({
  level,
  currentXP,
  xpToNext,
  showLabel = true,
  size = "md",
}: XPBarProps) {
  const percentage = (currentXP / xpToNext) * 100;

  const heights = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between text-sm mb-1.5">
          <span className="font-bold text-cyan-400">LVL {level}</span>
          <span className="text-gray-400">
            {currentXP.toLocaleString()} / {xpToNext.toLocaleString()} XP
          </span>
        </div>
      )}
      <div className={`${heights[size]} bg-gray-800 rounded-full overflow-hidden`}>
        <div
          className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-500 ease-out"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
