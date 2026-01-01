"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import AchievementBadge from "@/components/ui/AchievementBadge";

interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  category: string;
  tier: number;
}

interface UserAchievement {
  id: string;
  unlockedAt: string;
  achievement: Achievement;
}

const ICON_MAP: Record<string, string> = {
  footprints: "👣",
  compass: "🧭",
  map: "🗺️",
  globe: "🌍",
  building: "🏙️",
  buildings: "🌆",
  sparkles: "✨",
  plane: "🛂",
  airplane: "✈️",
  earth: "🌐",
  utensils: "🍽️",
  star: "⭐",
  "chef-hat": "👨‍🍳",
  beer: "🍺",
  cocktail: "🍸",
  tree: "🌲",
  mountain: "🏔️",
  flame: "🔥",
  fire: "🔥",
  trophy: "🏆",
  medal: "🎖️",
  crown: "👑",
  landmark: "🏛️",
  camera: "📸",
  "umbrella-beach": "🏖️",
  waves: "🌊",
};

const CATEGORIES = [
  { value: "exploration", label: "Exploration" },
  { value: "foodie", label: "Foodie" },
  { value: "nightlife", label: "Nightlife" },
  { value: "nature", label: "Nature" },
  { value: "culture", label: "Culture" },
  { value: "streak", label: "Streaks" },
  { value: "milestone", label: "Milestones" },
];

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAchievements() {
      try {
        const res = await fetch("/api/achievements");
        if (res.ok) {
          const data = await res.json();
          setAchievements(data.achievements || []);
          setUserAchievements(data.userAchievements || []);
        }
      } catch (error) {
        console.error("Failed to fetch achievements:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAchievements();
  }, []);

  const unlockedCodes = new Set(userAchievements.map((ua) => ua.achievement.code));

  const filteredAchievements = selectedCategory
    ? achievements.filter((a) => a.category === selectedCategory)
    : achievements;

  const unlockedCount = userAchievements.length;
  const totalCount = achievements.length;
  const progressPercent = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="w-12 h-12 rounded"
          style={{
            border: '4px solid var(--rpg-border)',
            borderTop: '4px solid var(--rpg-gold)',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(255, 215, 0, 0.2)', border: '2px solid var(--rpg-gold)' }}
          >
            <Trophy className="w-6 h-6" style={{ color: 'var(--rpg-gold)' }} />
          </div>
          <div>
            <h1 className="text-lg" style={{ color: 'var(--rpg-gold)', textShadow: '0 0 10px var(--rpg-gold-glow)' }}>
              Achievements
            </h1>
            <p className="text-[0.55rem]" style={{ color: 'var(--rpg-muted)' }}>
              {unlockedCount} of {totalCount} unlocked
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div
          className="rounded-lg p-4"
          style={{
            background: 'var(--rpg-card)',
            border: '2px solid var(--rpg-border)',
            boxShadow: '0 4px 0 rgba(0, 0, 0, 0.3)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[0.5rem]" style={{ color: 'var(--rpg-muted)' }}>Overall Progress</span>
            <span className="text-[0.5rem]" style={{ color: 'var(--rpg-text)' }}>
              {progressPercent.toFixed(0)}%
            </span>
          </div>
          <div
            className="h-3 rounded overflow-hidden"
            style={{ background: 'var(--rpg-border)', border: '2px solid var(--rpg-border-light)' }}
          >
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                background: 'linear-gradient(90deg, var(--rpg-gold) 0%, var(--rpg-teal) 100%)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedCategory(null)}
          className="px-3 py-1.5 rounded text-[0.5rem] transition-colors"
          style={{
            background: selectedCategory === null ? 'var(--rpg-teal)' : 'var(--rpg-card)',
            color: selectedCategory === null ? 'var(--rpg-bg-dark)' : 'var(--rpg-muted)',
            border: `2px solid ${selectedCategory === null ? 'var(--rpg-teal-dark)' : 'var(--rpg-border)'}`,
          }}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className="px-3 py-1.5 rounded text-[0.5rem] transition-colors"
            style={{
              background: selectedCategory === cat.value ? 'var(--rpg-teal)' : 'var(--rpg-card)',
              color: selectedCategory === cat.value ? 'var(--rpg-bg-dark)' : 'var(--rpg-muted)',
              border: `2px solid ${selectedCategory === cat.value ? 'var(--rpg-teal-dark)' : 'var(--rpg-border)'}`,
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Achievements Grid */}
      {filteredAchievements.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[0.55rem]" style={{ color: 'var(--rpg-muted)' }}>
            No achievements in this category yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredAchievements
            .sort((a, b) => {
              const aUnlocked = unlockedCodes.has(a.code) ? 0 : 1;
              const bUnlocked = unlockedCodes.has(b.code) ? 0 : 1;
              if (aUnlocked !== bUnlocked) return aUnlocked - bUnlocked;
              if (a.tier !== b.tier) return a.tier - b.tier;
              return a.name.localeCompare(b.name);
            })
            .map((achievement) => (
              <AchievementBadge
                key={achievement.id || achievement.code}
                name={achievement.name}
                icon={ICON_MAP[achievement.icon] || "🏆"}
                tier={achievement.tier}
                unlocked={unlockedCodes.has(achievement.code)}
                description={`${achievement.description} (+${achievement.xpReward} XP)`}
              />
            ))}
        </div>
      )}

      {/* Recently Unlocked */}
      {userAchievements.length > 0 && (
        <div className="mt-12">
          <h2 className="text-[0.75rem] mb-4" style={{ color: 'var(--rpg-teal)', textShadow: '0 0 8px var(--rpg-teal-glow)' }}>
            Recently Unlocked
          </h2>
          <div className="space-y-3">
            {userAchievements
              .sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime())
              .slice(0, 5)
              .map((ua) => (
                <div
                  key={ua.id}
                  className="flex items-center gap-4 rounded-lg p-4"
                  style={{
                    background: 'var(--rpg-card)',
                    border: '2px solid var(--rpg-border)',
                    boxShadow: '0 4px 0 rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <div className="text-xl">
                    {ICON_MAP[ua.achievement.icon] || "🏆"}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[0.6rem]" style={{ color: 'var(--rpg-text)' }}>{ua.achievement.name}</h3>
                    <p className="text-[0.5rem]" style={{ color: 'var(--rpg-muted)' }}>{ua.achievement.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.55rem]" style={{ color: 'var(--rpg-teal)' }}>+{ua.achievement.xpReward} XP</p>
                    <p className="text-[0.45rem]" style={{ color: 'var(--rpg-muted)' }}>
                      {new Date(ua.unlockedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
