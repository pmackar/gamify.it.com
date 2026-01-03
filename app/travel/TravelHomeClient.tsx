"use client";

import { useRef } from "react";
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
  Sparkles,
  Clock,
  Target,
} from "lucide-react";
import FriendsActivityFeed from "./components/FriendsActivityFeed";
import TravelLeaderboard from "./components/TravelLeaderboard";

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
  const questsRef = useRef<HTMLDivElement>(null);

  // XP progress percentage
  const xpProgress = user.xpToNext > 0 ? (user.xp / user.xpToNext) * 100 : 100;

  // Type icons for locations
  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "restaurant": return "🍽️";
      case "bar": return "🍸";
      case "cafe": return "☕";
      case "hotel": return "🏨";
      case "museum": return "🏛️";
      case "park": return "🌳";
      case "beach": return "🏖️";
      case "landmark": return "🗿";
      case "shopping": return "🛍️";
      default: return "📍";
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
    <div className="travel-home">
      {/* ========== MOBILE LAYOUT ========== */}
      <div className="lg:hidden">
          {/* Hero Section */}
          <div className="hero-section">
            {/* Floating Stats Badges */}
            <div className="floating-badges">
              <Link href="/travel/achievements" className="badge badge-gold">
                <Trophy size={16} />
                <span>{stats.achievements}/{stats.totalAchievements}</span>
              </Link>
              <Link href="/travel/profile" className="badge badge-streak">
                <Flame size={16} />
                <span>{user.streak} day{user.streak !== 1 ? "s" : ""}</span>
              </Link>
            </div>

            {/* Level Circle */}
            <div className="level-container">
              <div className="xp-ring">
                <svg className="xp-ring-svg" viewBox="0 0 100 100">
                  <circle className="xp-ring-bg" cx="50" cy="50" r="45" />
                  <circle
                    className="xp-ring-progress"
                    cx="50"
                    cy="50"
                    r="45"
                    strokeDasharray={`${xpProgress * 2.83} 283`}
                  />
                </svg>
                <div className="level-display">
                  <span className="level-label">Level</span>
                  <span className="level-number">{user.level}</span>
                </div>
              </div>

              <p className="xp-text">
                <span className="xp-current">{user.xp.toLocaleString()}</span>
                {" / "}
                <span>{user.xpToNext.toLocaleString()} XP</span>
              </p>

              {/* Stats Row */}
              <div className="stats-row">
                <Link href="/travel/cities" className="stat-item">
                  <div className="stat-value stat-teal">{stats.countries}</div>
                  <div className="stat-label">Countries</div>
                </Link>
                <div className="stat-divider" />
                <Link href="/travel/cities" className="stat-item">
                  <div className="stat-value stat-purple">{stats.cities}</div>
                  <div className="stat-label">Cities</div>
                </Link>
                <div className="stat-divider" />
                <Link href="/travel/locations" className="stat-item">
                  <div className="stat-value stat-cyan">{stats.locations}</div>
                  <div className="stat-label">Places</div>
                </Link>
              </div>
            </div>
          </div>

          {/* Primary Actions */}
          <div className="actions-container">
            <div className="actions-grid">
              <button onClick={() => router.push("/travel/locations/new")} className="action-btn action-teal">
                <div className="action-icon">
                  <Plus size={24} />
                </div>
                <span className="action-title">Log Visit</span>
                <span className="action-subtitle">+15 XP</span>
              </button>

              <button onClick={() => router.push("/travel/quests/new")} className="action-btn action-purple">
                <div className="action-icon">
                  <Compass size={24} />
                </div>
                <span className="action-title">Plan Quest</span>
                <span className="action-subtitle">Create itinerary</span>
              </button>
            </div>
          </div>

          {/* Active Quests Carousel */}
          {activeQuests.length > 0 && (
            <div className="section">
              <div className="section-header">
                <h2 className="section-title">
                  <Target size={18} style={{ color: "var(--rpg-purple)" }} />
                  Active Quests
                </h2>
                <Link href="/travel/quests" className="section-link">
                  View all <ChevronRight size={14} />
                </Link>
              </div>

              <div ref={questsRef} className="quests-carousel">
                {activeQuests.map((quest) => {
                  const progressPct = quest.progress.total > 0
                    ? (quest.progress.completed / quest.progress.total) * 100
                    : 0;
                  return (
                    <Link key={quest.id} href={`/travel/quests/${quest.id}`} className="quest-card">
                      <div className="quest-header">
                        <div>
                          <h3 className="quest-name">{quest.name}</h3>
                          <p className="quest-cities">{quest.cities.map((c) => c.name).join(", ")}</p>
                        </div>
                        <span className={`quest-status ${quest.status === "ACTIVE" ? "active" : "planning"}`}>
                          {quest.status === "ACTIVE" ? "Active" : "Planning"}
                        </span>
                      </div>
                      <div className="quest-progress-bar">
                        <div className="quest-progress-fill" style={{ width: `${progressPct}%` }} />
                      </div>
                      <div className="quest-progress-text">
                        <span>{quest.progress.completed} completed</span>
                        <span>{quest.progress.total} total</span>
                      </div>
                    </Link>
                  );
                })}
                <Link href="/travel/quests/new" className="quest-card-new">
                  <Plus size={24} />
                  <span>New Quest</span>
                </Link>
              </div>
            </div>
          )}

          {/* Quick Access Grid */}
          <div className="section">
            <h2 className="section-title-solo">Explore</h2>
            <div className="quick-grid">
              {[
                { icon: <Map size={20} />, label: "Map", href: "/travel/map", colorClass: "cyan" },
                { icon: <Heart size={20} />, label: "Hotlist", href: "/travel/hotlist", colorClass: "red" },
                { icon: <Building2 size={20} />, label: "Cities", href: "/travel/cities", colorClass: "purple" },
                { icon: <Trophy size={20} />, label: "Badges", href: "/travel/achievements", colorClass: "gold" },
              ].map((item) => (
                <Link key={item.label} href={item.href} className={`quick-item quick-${item.colorClass}`}>
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Visits */}
          {recentVisits.length > 0 && (
            <div className="section section-last">
              <div className="section-header">
                <h2 className="section-title">
                  <Clock size={18} style={{ color: "var(--rpg-muted)" }} />
                  Recent Visits
                </h2>
                <Link href="/travel/locations" className="section-link">
                  View all <ChevronRight size={14} />
                </Link>
              </div>

              <div className="visits-list">
                {recentVisits.map((visit) => (
                  <Link key={visit.id} href={`/travel/locations/${visit.location.id}`} className="visit-item">
                    <span className="visit-icon">{getTypeIcon(visit.location.type)}</span>
                    <div className="visit-info">
                      <p className="visit-name">{visit.location.name}</p>
                      <p className="visit-location">{visit.location.city}, {visit.location.country}</p>
                    </div>
                    <span className="visit-time">{formatRelativeTime(visit.visitedAt)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Friends Activity */}
          <div className="section">
            <FriendsActivityFeed />
          </div>

          {/* Travel Leaderboard */}
          <div className="section section-last">
            <TravelLeaderboard />
          </div>

          {/* Empty state for new users */}
          {stats.locations === 0 && (
            <div className="section section-last">
              <div className="empty-state">
                <Sparkles size={32} style={{ color: "var(--rpg-teal)" }} />
                <h3>Start Your Adventure</h3>
                <p>Log your first location to begin tracking your travels and earning XP!</p>
                <button onClick={() => router.push("/travel/locations/new")} className="empty-cta">
                  Add Your First Place
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ========== DESKTOP LAYOUT ========== */}
        <div className="hidden lg:block">
          <main className="travel-main">
            {/* Welcome Header */}
            <div className="main-header">
              <div className="main-header-text">
                <h1>Welcome back, Explorer!</h1>
                <p>Ready to continue your adventure?</p>
              </div>
              <div className="main-header-actions">
                <Link href="/travel/locations/new" className="header-btn header-btn-primary">
                  <Plus size={18} />
                  Log Visit
                </Link>
                <Link href="/travel/quests/new" className="header-btn header-btn-secondary">
                  <Compass size={18} />
                  Plan Quest
                </Link>
              </div>
            </div>

            {/* Hotlist Quick Link - if user has hotlist items */}
            {stats.hotlist > 0 && (
              <Link href="/travel/hotlist" className="hotlist-banner">
                <Heart size={20} className="hotlist-icon" />
                <div className="hotlist-text">
                  <span className="hotlist-count">{stats.hotlist}</span> place{stats.hotlist !== 1 ? 's' : ''} on your hotlist
                </div>
                <ChevronRight size={18} />
              </Link>
            )}

            {/* Active Quests Section */}
            {activeQuests.length > 0 && (
              <div className="main-section">
                <div className="section-header">
                  <h2 className="section-title">
                    <Target size={18} />
                    Active Quests
                  </h2>
                  <Link href="/travel/quests" className="section-link">View all <ChevronRight size={14} /></Link>
                </div>

                <div className="quests-grid">
                  {activeQuests.map((quest) => {
                    const progressPct = quest.progress.total > 0
                      ? (quest.progress.completed / quest.progress.total) * 100
                      : 0;
                    return (
                      <Link key={quest.id} href={`/travel/quests/${quest.id}`} className="quest-card-desktop">
                        <div className="quest-card-header">
                          <h3>{quest.name}</h3>
                          <span className={`quest-badge ${quest.status === "ACTIVE" ? "active" : "planning"}`}>
                            {quest.status === "ACTIVE" ? "Active" : "Planning"}
                          </span>
                        </div>
                        <p className="quest-card-cities">{quest.cities.map((c) => c.name).join(" → ")}</p>
                        <div className="quest-card-progress">
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                          </div>
                          <span className="progress-text">{quest.progress.completed}/{quest.progress.total}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Visits Section */}
            <div className="main-section">
              <div className="section-header">
                <h2 className="section-title">
                  <Clock size={18} />
                  Recent Visits
                </h2>
                <Link href="/travel/locations" className="section-link">View all <ChevronRight size={14} /></Link>
              </div>

              {recentVisits.length > 0 ? (
                <div className="visits-grid">
                  {recentVisits.map((visit) => (
                    <Link key={visit.id} href={`/travel/locations/${visit.location.id}`} className="visit-card-desktop">
                      <span className="visit-type-icon">{getTypeIcon(visit.location.type)}</span>
                      <div className="visit-card-info">
                        <p className="visit-card-name">{visit.location.name}</p>
                        <p className="visit-card-location">{visit.location.city}, {visit.location.country}</p>
                      </div>
                      <span className="visit-card-time">{formatRelativeTime(visit.visitedAt)}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="empty-section">
                  <MapPin size={32} />
                  <p>No visits logged yet</p>
                  <Link href="/travel/locations/new" className="empty-cta">
                    <Plus size={16} /> Log your first visit
                  </Link>
                </div>
              )}
            </div>

            {/* Stats Overview */}
            <div className="main-section">
              <div className="section-header">
                <h2 className="section-title">
                  <Sparkles size={18} />
                  Your Journey
                </h2>
              </div>

              <div className="stats-overview">
                <div className="stat-card stat-card-teal">
                  <Globe size={24} />
                  <div className="stat-card-value">{stats.countries}</div>
                  <div className="stat-card-label">Countries</div>
                </div>
                <div className="stat-card stat-card-purple">
                  <Building2 size={24} />
                  <div className="stat-card-value">{stats.cities}</div>
                  <div className="stat-card-label">Cities</div>
                </div>
                <div className="stat-card stat-card-cyan">
                  <MapPin size={24} />
                  <div className="stat-card-value">{stats.locations}</div>
                  <div className="stat-card-label">Places</div>
                </div>
                <div className="stat-card stat-card-gold">
                  <Trophy size={24} />
                  <div className="stat-card-value">{stats.achievements}/{stats.totalAchievements}</div>
                  <div className="stat-card-label">Achievements</div>
                </div>
              </div>
            </div>

            {/* Friends Section */}
            <div className="main-section">
              <div className="friends-grid">
                <FriendsActivityFeed />
                <TravelLeaderboard />
              </div>
            </div>
          </main>
        </div>

        {/* Mobile Bottom Spacer */}
        <div className="lg:hidden h-24" />

        <style jsx>{`
          .travel-home {
            min-height: 100vh;
            background: var(--rpg-bg);
          }

          /* ===== MOBILE STYLES ===== */
          .hero-section {
            position: relative;
            min-height: 55vh;
            display: flex;
            flex-direction: column;
            background:
              radial-gradient(ellipse 80% 50% at 50% 0%, var(--rpg-teal-glow) 0%, transparent 50%),
              radial-gradient(ellipse 60% 40% at 80% 20%, rgba(168, 85, 247, 0.1) 0%, transparent 50%),
              linear-gradient(180deg, var(--rpg-bg) 0%, var(--rpg-card) 100%);
          }

          .floating-badges {
            position: absolute;
            top: 16px;
            left: 16px;
            right: 16px;
            display: flex;
            justify-content: space-between;
          }

          .badge {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-radius: 20px;
            backdrop-filter: blur(8px);
            transition: transform 0.2s;
            font-size: 14px;
            font-weight: 500;
          }
          .badge:active { transform: scale(0.95); }

          .badge-gold {
            background: rgba(255, 215, 0, 0.15);
            border: 1px solid rgba(255, 215, 0, 0.3);
            color: var(--rpg-gold);
          }
          .badge-streak {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #ef4444;
          }

          .level-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 64px 24px 24px;
          }

          .xp-ring {
            position: relative;
            margin-bottom: 16px;
          }
          .xp-ring-svg {
            width: 128px;
            height: 128px;
            transform: rotate(-90deg);
          }
          .xp-ring-svg-sm {
            width: 64px;
            height: 64px;
            transform: rotate(-90deg);
          }
          .xp-ring-bg {
            fill: none;
            stroke: rgba(95, 191, 138, 0.2);
            stroke-width: 6;
          }
          .xp-ring-progress {
            fill: none;
            stroke: url(#xpGradient);
            stroke-width: 6;
            stroke-linecap: round;
            transition: stroke-dasharray 1s ease;
          }

          .level-display {
            position: absolute;
            inset: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .level-label {
            font-size: 12px;
            color: var(--rpg-muted);
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }
          .level-number {
            font-size: 36px;
            font-weight: bold;
            color: var(--rpg-gold);
            text-shadow: 0 0 20px var(--rpg-gold-glow);
          }

          .xp-text {
            font-size: 14px;
            color: var(--rpg-muted);
            margin-bottom: 24px;
          }
          .xp-current {
            color: var(--rpg-text);
            font-weight: 500;
          }

          .stats-row {
            display: flex;
            gap: 24px;
            justify-content: center;
          }
          .stat-item {
            text-align: center;
          }
          .stat-item:active .stat-value { transform: scale(1.1); }
          .stat-value {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 4px;
            transition: transform 0.2s;
          }
          .stat-label {
            font-size: 12px;
            color: var(--rpg-muted);
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }
          .stat-divider {
            width: 1px;
            background: var(--rpg-border);
          }
          .stat-teal { color: var(--rpg-teal); }
          .stat-purple { color: var(--rpg-purple); }
          .stat-cyan { color: var(--rpg-cyan); }
          .stat-red { color: #ef4444; }
          .stat-orange { color: #f97316; }

          .actions-container {
            padding: 0 16px;
            margin-top: -24px;
            position: relative;
            z-index: 10;
          }
          .actions-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .action-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 24px 16px;
            border-radius: 16px;
            transition: transform 0.2s;
            border: 2px solid;
          }
          .action-btn:active { transform: scale(0.98); }
          .action-teal {
            background: linear-gradient(135deg, rgba(95, 191, 138, 0.2) 0%, rgba(95, 191, 138, 0.05) 100%);
            border-color: rgba(95, 191, 138, 0.4);
            box-shadow: 0 4px 20px rgba(95, 191, 138, 0.15);
          }
          .action-purple {
            background: linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(168, 85, 247, 0.05) 100%);
            border-color: rgba(168, 85, 247, 0.4);
            box-shadow: 0 4px 20px rgba(168, 85, 247, 0.15);
          }
          .action-cyan {
            background: linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(6, 182, 212, 0.05) 100%);
            border-color: rgba(6, 182, 212, 0.4);
          }
          .action-icon {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 8px;
          }
          .action-teal .action-icon { background: rgba(95, 191, 138, 0.3); color: var(--rpg-teal); }
          .action-purple .action-icon { background: rgba(168, 85, 247, 0.3); color: var(--rpg-purple); }
          .action-cyan .action-icon { background: rgba(6, 182, 212, 0.3); color: var(--rpg-cyan); }
          .action-title {
            font-size: 16px;
            font-weight: 500;
            color: var(--rpg-text);
          }
          .action-subtitle {
            font-size: 12px;
            color: var(--rpg-muted);
            margin-top: 2px;
          }

          .section {
            margin-top: 32px;
            padding: 0 16px;
          }
          .section-last {
            padding-bottom: 32px;
          }
          .section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
          }
          .section-title {
            font-size: 18px;
            font-weight: 600;
            color: var(--rpg-text);
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .section-title-solo {
            font-size: 18px;
            font-weight: 600;
            color: var(--rpg-text);
            margin-bottom: 12px;
          }
          .section-link {
            font-size: 14px;
            color: var(--rpg-muted);
            display: flex;
            align-items: center;
            gap: 4px;
          }

          .quests-carousel {
            display: flex;
            gap: 12px;
            overflow-x: auto;
            padding-bottom: 8px;
            margin: 0 -16px;
            padding-left: 16px;
            padding-right: 16px;
            scroll-snap-type: x mandatory;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .quests-carousel::-webkit-scrollbar { display: none; }

          .quest-card {
            flex-shrink: 0;
            width: 280px;
            padding: 16px;
            border-radius: 12px;
            scroll-snap-align: start;
            transition: transform 0.2s;
            background: rgba(168, 85, 247, 0.1);
            border: 1px solid rgba(168, 85, 247, 0.3);
          }
          .quest-card:active { transform: scale(0.98); }
          .quest-card-new {
            flex-shrink: 0;
            width: 280px;
            padding: 16px;
            border-radius: 12px;
            scroll-snap-align: start;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 120px;
            background: rgba(255, 255, 255, 0.02);
            border: 1px dashed rgba(255, 255, 255, 0.2);
            color: var(--rpg-muted);
            font-size: 14px;
            gap: 8px;
          }
          .quest-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
          }
          .quest-name {
            font-weight: 500;
            color: var(--rpg-text);
            margin-bottom: 4px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .quest-cities {
            font-size: 12px;
            color: var(--rpg-muted);
          }
          .quest-status {
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 12px;
          }
          .quest-status.active {
            background: rgba(95, 191, 138, 0.2);
            color: var(--rpg-teal);
          }
          .quest-status.planning {
            background: rgba(168, 85, 247, 0.2);
            color: var(--rpg-purple);
          }
          .quest-progress-bar {
            height: 8px;
            border-radius: 4px;
            background: var(--rpg-border);
            overflow: hidden;
          }
          .quest-progress-fill {
            height: 100%;
            border-radius: 4px;
            background: linear-gradient(90deg, var(--rpg-purple) 0%, var(--rpg-teal) 100%);
            transition: width 0.5s ease;
          }
          .quest-progress-text {
            display: flex;
            justify-content: space-between;
            margin-top: 8px;
            font-size: 12px;
            color: var(--rpg-muted);
          }

          .quick-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
          }
          .quick-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 16px 8px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: transform 0.2s;
            font-size: 12px;
            gap: 8px;
          }
          .quick-item:active { transform: scale(0.95); }
          .quick-item span { color: var(--rpg-muted); }
          .quick-cyan { color: var(--rpg-cyan); }
          .quick-red { color: #ef4444; }
          .quick-purple { color: var(--rpg-purple); }
          .quick-gold { color: var(--rpg-gold); }

          .visits-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .visit-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            transition: transform 0.2s;
          }
          .visit-item:active { transform: scale(0.99); }
          .visit-icon { font-size: 24px; }
          .visit-icon-lg { font-size: 32px; }
          .visit-info { flex: 1; min-width: 0; }
          .visit-name {
            color: var(--rpg-text);
            font-weight: 500;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .visit-location {
            font-size: 12px;
            color: var(--rpg-muted);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .visit-time {
            font-size: 12px;
            color: var(--rpg-muted);
            white-space: nowrap;
          }

          .empty-state {
            padding: 24px;
            border-radius: 16px;
            text-align: center;
            background: rgba(95, 191, 138, 0.05);
            border: 1px solid rgba(95, 191, 138, 0.2);
          }
          .empty-state h3 {
            font-size: 18px;
            color: var(--rpg-text);
            margin: 12px 0 8px;
          }
          .empty-state p {
            font-size: 14px;
            color: var(--rpg-muted);
            margin-bottom: 16px;
          }
          .empty-cta {
            padding: 12px 24px;
            border-radius: 12px;
            font-weight: 500;
            color: white;
            background: linear-gradient(135deg, var(--rpg-teal) 0%, var(--rpg-teal-dark) 100%);
          }

          /* ===== DESKTOP STYLES ===== */
          /* Main Content Area */
          .travel-main {
            padding: 32px 24px;
          }

          .main-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 32px;
            padding-bottom: 24px;
            border-bottom: 1px solid var(--rpg-border);
          }

          .main-header-text h1 {
            font-size: 24px;
            font-weight: bold;
            color: var(--rpg-text);
            margin-bottom: 4px;
          }

          .main-header-text p {
            color: var(--rpg-muted);
          }

          /* Hotlist Banner */
          .hotlist-banner {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 20px;
            margin-bottom: 24px;
            border-radius: 12px;
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%);
            border: 1px solid rgba(239, 68, 68, 0.2);
            color: var(--rpg-text);
            transition: all 0.2s;
          }
          .hotlist-banner:hover {
            background: rgba(239, 68, 68, 0.15);
            border-color: rgba(239, 68, 68, 0.3);
          }
          .hotlist-banner :global(.hotlist-icon) {
            color: #ef4444;
          }
          .hotlist-text {
            flex: 1;
            font-size: 15px;
          }
          .hotlist-count {
            font-weight: 600;
            color: #ef4444;
          }

          .main-header-actions {
            display: flex;
            gap: 12px;
          }

          .header-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 18px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
          }

          .header-btn-primary {
            background: linear-gradient(135deg, var(--rpg-teal) 0%, rgba(95, 191, 138, 0.8) 100%);
            color: white;
            box-shadow: 0 4px 12px var(--rpg-teal-glow);
          }
          .header-btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px var(--rpg-teal-glow);
          }

          .header-btn-secondary {
            background: rgba(168, 85, 247, 0.15);
            border: 1px solid rgba(168, 85, 247, 0.3);
            color: var(--rpg-purple);
          }
          .header-btn-secondary:hover {
            background: rgba(168, 85, 247, 0.25);
          }

          /* Main Sections */
          .main-section {
            margin-bottom: 32px;
          }

          /* Quest Cards Grid */
          .quests-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 16px;
          }

          .quest-card-desktop {
            padding: 20px;
            border-radius: 12px;
            background: rgba(168, 85, 247, 0.08);
            border: 1px solid rgba(168, 85, 247, 0.2);
            transition: all 0.2s;
          }
          .quest-card-desktop:hover {
            transform: translateY(-2px);
            background: rgba(168, 85, 247, 0.12);
            box-shadow: 0 4px 12px rgba(168, 85, 247, 0.15);
          }

          .quest-card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
          }

          .quest-card-header h3 {
            font-size: 16px;
            font-weight: 600;
            color: var(--rpg-text);
          }

          .quest-badge {
            font-size: 11px;
            padding: 4px 10px;
            border-radius: 12px;
            font-weight: 500;
          }
          .quest-badge.active {
            background: rgba(95, 191, 138, 0.2);
            color: var(--rpg-teal);
          }
          .quest-badge.planning {
            background: rgba(168, 85, 247, 0.2);
            color: var(--rpg-purple);
          }

          .quest-card-cities {
            font-size: 13px;
            color: var(--rpg-muted);
            margin-bottom: 12px;
          }

          .quest-card-progress {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .progress-bar {
            flex: 1;
            height: 6px;
            background: var(--rpg-border);
            border-radius: 3px;
            overflow: hidden;
          }

          .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--rpg-purple) 0%, var(--rpg-teal) 100%);
            border-radius: 3px;
            transition: width 0.5s ease;
          }

          .progress-text {
            font-size: 12px;
            color: var(--rpg-muted);
            white-space: nowrap;
          }

          /* Visits Grid */
          .visits-grid {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .visit-card-desktop {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 16px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid var(--rpg-border);
            transition: all 0.2s;
          }
          .visit-card-desktop:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(255, 255, 255, 0.15);
          }

          .visit-type-icon { font-size: 28px; }

          .visit-card-info { flex: 1; min-width: 0; }

          .visit-card-name {
            font-size: 15px;
            font-weight: 500;
            color: var(--rpg-text);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .visit-card-location {
            font-size: 13px;
            color: var(--rpg-muted);
          }

          .visit-card-time {
            font-size: 12px;
            color: var(--rpg-muted);
            white-space: nowrap;
          }

          /* Empty Section */
          .empty-section {
            padding: 40px;
            border-radius: 12px;
            text-align: center;
            background: rgba(255, 255, 255, 0.02);
            border: 1px dashed rgba(255, 255, 255, 0.1);
            color: var(--rpg-muted);
          }
          .empty-section p {
            margin: 12px 0 16px;
          }
          .empty-cta {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            border-radius: 8px;
            color: var(--rpg-teal);
            background: rgba(95, 191, 138, 0.1);
            transition: background 0.2s;
          }
          .empty-cta:hover {
            background: rgba(95, 191, 138, 0.2);
          }

          /* Stats Overview */
          .stats-overview {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
          }

          .stat-card {
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            border: 1px solid;
            transition: transform 0.2s;
          }
          .stat-card:hover {
            transform: translateY(-2px);
          }

          .stat-card-teal {
            background: rgba(95, 191, 138, 0.08);
            border-color: rgba(95, 191, 138, 0.2);
            color: var(--rpg-teal);
          }
          .stat-card-purple {
            background: rgba(168, 85, 247, 0.08);
            border-color: rgba(168, 85, 247, 0.2);
            color: var(--rpg-purple);
          }
          .stat-card-cyan {
            background: rgba(6, 182, 212, 0.08);
            border-color: rgba(6, 182, 212, 0.2);
            color: var(--rpg-cyan);
          }
          .stat-card-gold {
            background: rgba(255, 215, 0, 0.08);
            border-color: rgba(255, 215, 0, 0.2);
            color: var(--rpg-gold);
          }

          .stat-card-value {
            font-size: 28px;
            font-weight: bold;
            margin: 8px 0 4px;
            color: var(--rpg-text);
          }

          .stat-card-label {
            font-size: 12px;
            color: var(--rpg-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          /* Friends Grid */
          .friends-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
          }

          @media (max-width: 1200px) {
            .friends-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>

        {/* SVG Gradient Definition */}
        <svg style={{ position: "absolute", width: 0, height: 0 }}>
          <defs>
            <linearGradient id="xpGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--rpg-teal)" />
              <stop offset="100%" stopColor="var(--rpg-purple)" />
            </linearGradient>
          </defs>
        </svg>
      </div>
  );
}
