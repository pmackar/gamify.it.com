"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  MapPin,
  Compass,
  Globe,
  Building2,
  Heart,
  Trophy,
  Flame,
  ChevronRight,
  Map,
  Scroll,
  Sparkles,
  Clock,
  Target,
} from "lucide-react";
import TravelApp from "./TravelApp";

interface TravelHomeClientProps {
  user: {
    level: number;
    xp: number;
    xpToNext: number;
    streak: number;
  };
  stats: {
    countries: number;
    cities: number;
    locations: number;
    visits: number;
    hotlist: number;
    achievements: number;
    totalAchievements: number;
  };
  recentVisits: Array<{
    id: string;
    visitedAt: string;
    location: {
      id: string;
      name: string;
      type: string;
      city: string;
      country: string;
    };
  }>;
  activeQuests: Array<{
    id: string;
    name: string;
    status: string;
    cities: Array<{ name: string; country: string }>;
    progress: { total: number; completed: number };
  }>;
}

export default function TravelHomeClient({
  user,
  stats,
  recentVisits,
  activeQuests,
}: TravelHomeClientProps) {
  const router = useRouter();
  const [activeQuestIndex, setActiveQuestIndex] = useState(0);
  const questsRef = useRef<HTMLDivElement>(null);

  // XP progress percentage
  const xpProgress = user.xpToNext > 0 ? (user.xp / user.xpToNext) * 100 : 100;

  // Type icons for locations
  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "restaurant":
        return "🍽️";
      case "bar":
        return "🍸";
      case "cafe":
        return "☕";
      case "hotel":
        return "🏨";
      case "museum":
        return "🏛️";
      case "park":
        return "🌳";
      case "beach":
        return "🏖️";
      case "landmark":
        return "🗿";
      case "shopping":
        return "🛍️";
      default:
        return "📍";
    }
  };

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <TravelApp isLoggedIn={true}>
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* ========== MOBILE LAYOUT ========== */}
      <div className="lg:hidden">
        {/* Hero Section - Full viewport with gradient */}
        <div
          className="relative min-h-[55vh] flex flex-col"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 50% 0%, rgba(95, 191, 138, 0.15) 0%, transparent 50%),
              radial-gradient(ellipse 60% 40% at 80% 20%, rgba(168, 85, 247, 0.1) 0%, transparent 50%),
              linear-gradient(180deg, #0a0a0f 0%, #12121a 100%)
            `,
          }}
        >
          {/* Floating Stats Badges */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
            <Link
              href="/travel/achievements"
              className="flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-sm transition-transform active:scale-95"
              style={{
                background: "rgba(255, 215, 0, 0.15)",
                border: "1px solid rgba(255, 215, 0, 0.3)",
              }}
            >
              <Trophy size={16} className="text-yellow-400" />
              <span className="text-sm font-medium text-yellow-400">
                {stats.achievements}/{stats.totalAchievements}
              </span>
            </Link>
            <Link
              href="/travel/profile"
              className="flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-sm transition-transform active:scale-95"
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
              }}
            >
              <Flame size={16} className="text-red-400" />
              <span className="text-sm font-medium text-red-400">
                {user.streak} day{user.streak !== 1 ? "s" : ""}
              </span>
            </Link>
          </div>

          {/* Level Circle - Centered */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16">
            {/* XP Ring */}
            <div className="relative mb-4">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="rgba(95, 191, 138, 0.2)"
                  strokeWidth="6"
                />
                {/* Progress circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="url(#xpGradient)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${xpProgress * 2.83} 283`}
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id="xpGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#5fbf8a" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
              {/* Level number */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-gray-400 uppercase tracking-wider">Level</span>
                <span
                  className="text-4xl font-bold"
                  style={{
                    color: "#ffd700",
                    textShadow: "0 0 20px rgba(255, 215, 0, 0.5)",
                  }}
                >
                  {user.level}
                </span>
              </div>
            </div>

            {/* XP Text */}
            <p className="text-sm text-gray-400 mb-6">
              <span className="text-white font-medium">{user.xp.toLocaleString()}</span>
              {" / "}
              <span>{user.xpToNext.toLocaleString()} XP</span>
            </p>

            {/* Stats Row */}
            <div className="flex gap-6 justify-center">
              <Link href="/travel/cities" className="text-center group">
                <div
                  className="text-2xl font-bold mb-1 group-active:scale-110 transition-transform"
                  style={{ color: "#5fbf8a" }}
                >
                  {stats.countries}
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Countries</div>
              </Link>
              <div className="w-px bg-gray-800" />
              <Link href="/travel/cities" className="text-center group">
                <div
                  className="text-2xl font-bold mb-1 group-active:scale-110 transition-transform"
                  style={{ color: "#a855f7" }}
                >
                  {stats.cities}
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Cities</div>
              </Link>
              <div className="w-px bg-gray-800" />
              <Link href="/travel/locations" className="text-center group">
                <div
                  className="text-2xl font-bold mb-1 group-active:scale-110 transition-transform"
                  style={{ color: "#06b6d4" }}
                >
                  {stats.locations}
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Places</div>
              </Link>
            </div>
          </div>
        </div>

        {/* Primary Actions - Large touch targets */}
        <div className="px-4 -mt-6 relative z-10">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push("/travel/locations/new")}
              className="flex flex-col items-center justify-center py-6 rounded-2xl transition-all active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, rgba(95, 191, 138, 0.2) 0%, rgba(95, 191, 138, 0.05) 100%)",
                border: "2px solid rgba(95, 191, 138, 0.4)",
                boxShadow: "0 4px 20px rgba(95, 191, 138, 0.15)",
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
                style={{ background: "rgba(95, 191, 138, 0.3)" }}
              >
                <Plus size={24} className="text-[#5fbf8a]" />
              </div>
              <span className="text-base font-medium text-white">Log Visit</span>
              <span className="text-xs text-gray-400 mt-0.5">+15 XP</span>
            </button>

            <button
              onClick={() => router.push("/travel/quests/new")}
              className="flex flex-col items-center justify-center py-6 rounded-2xl transition-all active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(168, 85, 247, 0.05) 100%)",
                border: "2px solid rgba(168, 85, 247, 0.4)",
                boxShadow: "0 4px 20px rgba(168, 85, 247, 0.15)",
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
                style={{ background: "rgba(168, 85, 247, 0.3)" }}
              >
                <Compass size={24} className="text-purple-400" />
              </div>
              <span className="text-base font-medium text-white">Plan Quest</span>
              <span className="text-xs text-gray-400 mt-0.5">Create itinerary</span>
            </button>
          </div>
        </div>

        {/* Active Quests Carousel */}
        {activeQuests.length > 0 && (
          <div className="mt-8 px-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Target size={18} className="text-purple-400" />
                Active Quests
              </h2>
              <Link
                href="/travel/quests"
                className="text-sm text-gray-400 flex items-center gap-1"
              >
                View all <ChevronRight size={14} />
              </Link>
            </div>

            <div
              ref={questsRef}
              className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {activeQuests.map((quest, index) => {
                const progressPct =
                  quest.progress.total > 0
                    ? (quest.progress.completed / quest.progress.total) * 100
                    : 0;
                return (
                  <Link
                    key={quest.id}
                    href={`/travel/quests/${quest.id}`}
                    className="flex-shrink-0 w-[280px] p-4 rounded-xl snap-start transition-all active:scale-[0.98]"
                    style={{
                      background: "rgba(168, 85, 247, 0.1)",
                      border: "1px solid rgba(168, 85, 247, 0.3)",
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-white mb-1 line-clamp-1">
                          {quest.name}
                        </h3>
                        <p className="text-xs text-gray-400">
                          {quest.cities.map((c) => c.name).join(", ")}
                        </p>
                      </div>
                      <span
                        className="text-xs px-2 py-1 rounded-full"
                        style={{
                          background:
                            quest.status === "ACTIVE"
                              ? "rgba(95, 191, 138, 0.2)"
                              : "rgba(168, 85, 247, 0.2)",
                          color: quest.status === "ACTIVE" ? "#5fbf8a" : "#a855f7",
                        }}
                      >
                        {quest.status === "ACTIVE" ? "Active" : "Planning"}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progressPct}%`,
                          background: "linear-gradient(90deg, #a855f7 0%, #5fbf8a 100%)",
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-400">
                      <span>{quest.progress.completed} completed</span>
                      <span>{quest.progress.total} total</span>
                    </div>
                  </Link>
                );
              })}

              {/* Create quest card */}
              <Link
                href="/travel/quests/new"
                className="flex-shrink-0 w-[280px] p-4 rounded-xl snap-start flex flex-col items-center justify-center transition-all active:scale-[0.98]"
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px dashed rgba(255, 255, 255, 0.2)",
                  minHeight: "120px",
                }}
              >
                <Plus size={24} className="text-gray-500 mb-2" />
                <span className="text-sm text-gray-400">New Quest</span>
              </Link>
            </div>
          </div>
        )}

        {/* Quick Access Grid */}
        <div className="mt-8 px-4">
          <h2 className="text-lg font-semibold text-white mb-3">Explore</h2>
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: <Map size={20} />, label: "Map", href: "/travel/map", color: "#06b6d4" },
              { icon: <Heart size={20} />, label: "Hotlist", href: "/travel/hotlist", color: "#ef4444" },
              { icon: <Building2 size={20} />, label: "Cities", href: "/travel/cities", color: "#a855f7" },
              { icon: <Trophy size={20} />, label: "Badges", href: "/travel/achievements", color: "#ffd700" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex flex-col items-center py-4 rounded-xl transition-all active:scale-95"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                <span style={{ color: item.color }}>{item.icon}</span>
                <span className="text-xs text-gray-400 mt-2">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Visits */}
        {recentVisits.length > 0 && (
          <div className="mt-8 px-4 pb-32">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Clock size={18} className="text-gray-400" />
                Recent Visits
              </h2>
              <Link
                href="/travel/locations"
                className="text-sm text-gray-400 flex items-center gap-1"
              >
                View all <ChevronRight size={14} />
              </Link>
            </div>

            <div className="space-y-2">
              {recentVisits.map((visit) => (
                <Link
                  key={visit.id}
                  href={`/travel/locations/${visit.location.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.99]"
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <span className="text-2xl">{getTypeIcon(visit.location.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{visit.location.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {visit.location.city}, {visit.location.country}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {formatRelativeTime(visit.visitedAt)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty state for new users */}
        {stats.locations === 0 && (
          <div className="mt-8 px-4 pb-32">
            <div
              className="p-6 rounded-2xl text-center"
              style={{
                background: "rgba(95, 191, 138, 0.05)",
                border: "1px solid rgba(95, 191, 138, 0.2)",
              }}
            >
              <Sparkles size={32} className="text-[#5fbf8a] mx-auto mb-3" />
              <h3 className="text-lg font-medium text-white mb-2">Start Your Adventure</h3>
              <p className="text-sm text-gray-400 mb-4">
                Log your first location to begin tracking your travels and earning XP!
              </p>
              <button
                onClick={() => router.push("/travel/locations/new")}
                className="px-6 py-3 rounded-xl font-medium text-white transition-all active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #5fbf8a 0%, #4da876 100%)",
                }}
              >
                Add Your First Place
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========== DESKTOP LAYOUT ========== */}
      <div className="hidden lg:block min-h-screen">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="grid grid-cols-12 gap-8">
            {/* Left Column - Stats & Actions */}
            <div className="col-span-3 space-y-6">
              {/* Level Card */}
              <div
                className="p-6 rounded-2xl"
                style={{
                  background: "linear-gradient(135deg, rgba(95, 191, 138, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="rgba(95, 191, 138, 0.2)"
                        strokeWidth="8"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="url(#xpGradientDesktop)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${xpProgress * 2.64} 264`}
                      />
                      <defs>
                        <linearGradient id="xpGradientDesktop" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#5fbf8a" />
                          <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span
                        className="text-xl font-bold"
                        style={{ color: "#ffd700", textShadow: "0 0 10px rgba(255, 215, 0, 0.5)" }}
                      >
                        {user.level}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Explorer Level</p>
                    <p className="text-white">
                      {user.xp.toLocaleString()} / {user.xpToNext.toLocaleString()} XP
                    </p>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-black/20">
                    <p className="text-2xl font-bold text-[#5fbf8a]">{stats.countries}</p>
                    <p className="text-xs text-gray-400">Countries</p>
                  </div>
                  <div className="p-3 rounded-lg bg-black/20">
                    <p className="text-2xl font-bold text-purple-400">{stats.cities}</p>
                    <p className="text-xs text-gray-400">Cities</p>
                  </div>
                  <div className="p-3 rounded-lg bg-black/20">
                    <p className="text-2xl font-bold text-cyan-400">{stats.locations}</p>
                    <p className="text-xs text-gray-400">Places</p>
                  </div>
                  <div className="p-3 rounded-lg bg-black/20">
                    <p className="text-2xl font-bold text-red-400">{user.streak}</p>
                    <p className="text-xs text-gray-400">Day Streak</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-3">
                <Link
                  href="/travel/locations/new"
                  className="flex items-center gap-3 p-4 rounded-xl transition-all hover:scale-[1.02] group"
                  style={{
                    background: "rgba(95, 191, 138, 0.1)",
                    border: "1px solid rgba(95, 191, 138, 0.3)",
                  }}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#5fbf8a]/20">
                    <Plus size={20} className="text-[#5fbf8a]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">Log a Visit</p>
                    <p className="text-xs text-gray-400">+15 XP per location</p>
                  </div>
                  <ChevronRight size={18} className="text-gray-500 group-hover:text-[#5fbf8a] transition-colors" />
                </Link>

                <Link
                  href="/travel/quests/new"
                  className="flex items-center gap-3 p-4 rounded-xl transition-all hover:scale-[1.02] group"
                  style={{
                    background: "rgba(168, 85, 247, 0.1)",
                    border: "1px solid rgba(168, 85, 247, 0.3)",
                  }}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-500/20">
                    <Compass size={20} className="text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">Plan a Quest</p>
                    <p className="text-xs text-gray-400">Create travel itinerary</p>
                  </div>
                  <ChevronRight size={18} className="text-gray-500 group-hover:text-purple-400 transition-colors" />
                </Link>

                <Link
                  href="/travel/map"
                  className="flex items-center gap-3 p-4 rounded-xl transition-all hover:scale-[1.02] group"
                  style={{
                    background: "rgba(6, 182, 212, 0.1)",
                    border: "1px solid rgba(6, 182, 212, 0.3)",
                  }}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-cyan-500/20">
                    <Globe size={20} className="text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">World Map</p>
                    <p className="text-xs text-gray-400">See all your travels</p>
                  </div>
                  <ChevronRight size={18} className="text-gray-500 group-hover:text-cyan-400 transition-colors" />
                </Link>
              </div>

              {/* Navigation Links */}
              <div
                className="p-4 rounded-xl space-y-1"
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                {[
                  { icon: <Building2 size={18} />, label: "Cities", href: "/travel/cities", count: stats.cities },
                  { icon: <MapPin size={18} />, label: "Locations", href: "/travel/locations", count: stats.locations },
                  { icon: <Heart size={18} />, label: "Hotlist", href: "/travel/hotlist", count: stats.hotlist },
                  { icon: <Scroll size={18} />, label: "Quests", href: "/travel/quests", count: activeQuests.length },
                  { icon: <Trophy size={18} />, label: "Achievements", href: "/travel/achievements", count: stats.achievements },
                ].map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group"
                  >
                    <span className="text-gray-400 group-hover:text-white transition-colors">{item.icon}</span>
                    <span className="flex-1 text-gray-300 group-hover:text-white transition-colors">{item.label}</span>
                    <span className="text-sm text-gray-500">{item.count}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Center Column - Main Content */}
            <div className="col-span-6">
              {/* Welcome Header */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-white mb-1">Welcome back, Explorer!</h1>
                <p className="text-gray-400">Ready to continue your adventure?</p>
              </div>

              {/* Active Quests */}
              {activeQuests.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Target size={18} className="text-purple-400" />
                      Active Quests
                    </h2>
                    <Link href="/travel/quests" className="text-sm text-purple-400 hover:text-purple-300">
                      View all
                    </Link>
                  </div>

                  <div className="grid gap-4">
                    {activeQuests.map((quest) => {
                      const progressPct =
                        quest.progress.total > 0
                          ? (quest.progress.completed / quest.progress.total) * 100
                          : 0;
                      return (
                        <Link
                          key={quest.id}
                          href={`/travel/quests/${quest.id}`}
                          className="p-5 rounded-xl transition-all hover:scale-[1.01]"
                          style={{
                            background: "rgba(168, 85, 247, 0.08)",
                            border: "1px solid rgba(168, 85, 247, 0.2)",
                          }}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-medium text-white text-lg">{quest.name}</h3>
                              <p className="text-sm text-gray-400">
                                {quest.cities.map((c) => `${c.name}, ${c.country}`).join(" → ")}
                              </p>
                            </div>
                            <span
                              className="px-3 py-1 rounded-full text-sm"
                              style={{
                                background:
                                  quest.status === "ACTIVE"
                                    ? "rgba(95, 191, 138, 0.2)"
                                    : "rgba(168, 85, 247, 0.2)",
                                color: quest.status === "ACTIVE" ? "#5fbf8a" : "#a855f7",
                              }}
                            >
                              {quest.status === "ACTIVE" ? "In Progress" : "Planning"}
                            </span>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${progressPct}%`,
                                  background: "linear-gradient(90deg, #a855f7 0%, #5fbf8a 100%)",
                                }}
                              />
                            </div>
                            <span className="text-sm text-gray-400 whitespace-nowrap">
                              {quest.progress.completed} / {quest.progress.total}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent Visits */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Clock size={18} className="text-gray-400" />
                    Recent Visits
                  </h2>
                  <Link href="/travel/locations" className="text-sm text-gray-400 hover:text-white">
                    View all
                  </Link>
                </div>

                {recentVisits.length > 0 ? (
                  <div className="space-y-2">
                    {recentVisits.map((visit) => (
                      <Link
                        key={visit.id}
                        href={`/travel/locations/${visit.location.id}`}
                        className="flex items-center gap-4 p-4 rounded-xl transition-all hover:bg-white/5"
                        style={{
                          background: "rgba(255, 255, 255, 0.02)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                        }}
                      >
                        <span className="text-3xl">{getTypeIcon(visit.location.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium">{visit.location.name}</p>
                          <p className="text-sm text-gray-500">
                            {visit.location.city}, {visit.location.country}
                          </p>
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatRelativeTime(visit.visitedAt)}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div
                    className="p-8 rounded-xl text-center"
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px dashed rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    <MapPin size={32} className="text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 mb-4">No visits logged yet</p>
                    <Link
                      href="/travel/locations/new"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[#5fbf8a] bg-[#5fbf8a]/10 hover:bg-[#5fbf8a]/20 transition-colors"
                    >
                      <Plus size={16} />
                      Log your first visit
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Achievements & Hotlist Preview */}
            <div className="col-span-3 space-y-6">
              {/* Achievements Card */}
              <Link
                href="/travel/achievements"
                className="block p-5 rounded-xl transition-all hover:scale-[1.02]"
                style={{
                  background: "linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 165, 0, 0.05) 100%)",
                  border: "1px solid rgba(255, 215, 0, 0.2)",
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Trophy size={24} className="text-yellow-400" />
                  <div>
                    <p className="font-medium text-white">Achievements</p>
                    <p className="text-sm text-gray-400">
                      {stats.achievements} / {stats.totalAchievements} unlocked
                    </p>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-black/30 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-orange-500"
                    style={{
                      width: `${stats.totalAchievements > 0 ? (stats.achievements / stats.totalAchievements) * 100 : 0}%`,
                    }}
                  />
                </div>
              </Link>

              {/* Hotlist Preview */}
              <div
                className="p-5 rounded-xl"
                style={{
                  background: "rgba(239, 68, 68, 0.05)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Heart size={18} className="text-red-400" />
                    <p className="font-medium text-white">Hotlist</p>
                  </div>
                  <Link href="/travel/hotlist" className="text-sm text-red-400 hover:text-red-300">
                    View all
                  </Link>
                </div>
                <p className="text-3xl font-bold text-red-400 mb-1">{stats.hotlist}</p>
                <p className="text-sm text-gray-400">places saved</p>
              </div>

              {/* Streak Card */}
              <div
                className="p-5 rounded-xl"
                style={{
                  background: "rgba(239, 68, 68, 0.05)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Flame size={18} className="text-orange-400" />
                  <p className="font-medium text-white">Current Streak</p>
                </div>
                <p className="text-4xl font-bold text-orange-400 mb-1">{user.streak}</p>
                <p className="text-sm text-gray-400">
                  {user.streak === 1 ? "day" : "days"} in a row
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Spacer for Command Bar */}
      <div className="lg:hidden h-24" />

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
    </TravelApp>
  );
}
