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
    sm: "6px",
    md: "10px",
    lg: "14px",
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between text-[0.5rem] mb-1">
          <span style={{ color: 'var(--rpg-teal)', textShadow: '0 0 8px var(--rpg-teal-glow)' }}>
            LVL {level}
          </span>
          <span style={{ color: 'var(--rpg-muted)' }}>
            {currentXP.toLocaleString()} / {xpToNext.toLocaleString()} XP
          </span>
        </div>
      )}
      <div
        className="rounded overflow-hidden"
        style={{
          height: heights[size],
          background: 'var(--rpg-border)',
          border: '2px solid var(--rpg-border-light)',
        }}
      >
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{
            width: `${Math.min(percentage, 100)}%`,
            background: 'linear-gradient(90deg, var(--rpg-teal) 0%, var(--rpg-gold) 100%)',
            borderRadius: '2px',
          }}
        />
      </div>
    </div>
  );
}
