"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  showClear?: boolean;
}

// Half-step star rating component (0.5 to 5 in 0.5 increments)
export default function StarRating({
  value,
  onChange,
  disabled = false,
  size = "md",
  showValue = true,
  showClear = true,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayValue = hoverValue ?? value;

  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  const handleClick = (starIndex: number, isHalf: boolean) => {
    if (disabled) return;
    const newRating = isHalf ? starIndex + 0.5 : starIndex + 1;
    // Toggle off if clicking the same value
    if (newRating === value) {
      onChange(0);
    } else {
      onChange(newRating);
    }
  };

  const handleMouseMove = (e: React.MouseEvent, starIndex: number) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isHalf = x < rect.width / 2;
    setHoverValue(isHalf ? starIndex + 0.5 : starIndex + 1);
  };

  return (
    <div className="flex items-center gap-1">
      <div
        className="flex gap-1"
        onMouseLeave={() => setHoverValue(null)}
      >
        {[0, 1, 2, 3, 4].map((starIndex) => {
          const starValue = starIndex + 1;
          const halfValue = starIndex + 0.5;
          const isFull = displayValue >= starValue;
          const isHalf = !isFull && displayValue >= halfValue;

          return (
            <button
              key={starIndex}
              type="button"
              disabled={disabled}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const clickedHalf = x < rect.width / 2;
                handleClick(starIndex, clickedHalf);
              }}
              onMouseMove={(e) => handleMouseMove(e, starIndex)}
              className="relative p-1 transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ cursor: disabled ? "not-allowed" : "pointer" }}
            >
              {/* Background star (empty) */}
              <Star
                className={sizeClasses[size]}
                style={{ color: "var(--rpg-border)" }}
                fill="none"
              />
              {/* Filled star overlay */}
              {(isFull || isHalf) && (
                <div
                  className="absolute inset-0 p-1 overflow-hidden"
                  style={{ width: isHalf ? "50%" : "100%" }}
                >
                  <Star
                    className={sizeClasses[size]}
                    style={{ color: "var(--rpg-gold)" }}
                    fill="var(--rpg-gold)"
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>
      {showValue && displayValue > 0 && (
        <span className="ml-2 text-sm font-medium" style={{ color: "var(--rpg-gold)" }}>
          {displayValue.toFixed(1)}
        </span>
      )}
      {showClear && value > 0 && !disabled && (
        <button
          type="button"
          onClick={() => onChange(0)}
          disabled={disabled}
          className="ml-2 px-2 py-1 text-xs rounded transition-opacity hover:opacity-70"
          style={{ color: "var(--rpg-muted)" }}
        >
          Clear
        </button>
      )}
    </div>
  );
}
