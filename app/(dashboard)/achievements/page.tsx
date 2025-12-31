"use client";

import { useEffect, useState } from "react";
import { Trophy, Filter, X } from "lucide-react";
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Achievements</h1>
            <p className="text-gray-400">
              {unlockedCount} of {totalCount} unlocked
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Overall Progress</span>
            <span className="text-sm font-medium text-white">
              {progressPercent.toFixed(0)}%
            </span>
          </div>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            selectedCategory === null
              ? "bg-cyan-500 text-white"
              : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              selectedCategory === cat.value
                ? "bg-cyan-500 text-white"
                : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Achievements Grid */}
      {filteredAchievements.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400">No achievements in this category yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredAchievements
            .sort((a, b) => {
              // Sort by: unlocked first, then by tier, then by name
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
          <h2 className="text-xl font-semibold text-white mb-4">Recently Unlocked</h2>
          <div className="space-y-3">
            {userAchievements
              .sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime())
              .slice(0, 5)
              .map((ua) => (
                <div
                  key={ua.id}
                  className="flex items-center gap-4 bg-gray-900/50 border border-gray-800 rounded-lg p-4"
                >
                  <div className="text-2xl">
                    {ICON_MAP[ua.achievement.icon] || "🏆"}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-white">{ua.achievement.name}</h3>
                    <p className="text-sm text-gray-400">{ua.achievement.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-cyan-400 font-medium">+{ua.achievement.xpReward} XP</p>
                    <p className="text-xs text-gray-500">
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
