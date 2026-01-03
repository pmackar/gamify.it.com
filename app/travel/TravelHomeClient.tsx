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
    <TravelApp isLoggedIn={true}>
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
          <div className="desktop-container">
            <div className="desktop-grid">
              {/* Left Column */}
              <div className="desktop-left">
                {/* Level Card */}
                <div className="desktop-level-card">
                  <div className="desktop-level-header">
                    <div className="desktop-xp-ring">
                      <svg className="xp-ring-svg-sm" viewBox="0 0 100 100">
                        <circle className="xp-ring-bg" cx="50" cy="50" r="42" strokeWidth="8" />
                        <circle
                          className="xp-ring-progress"
                          cx="50"
                          cy="50"
                          r="42"
                          strokeWidth="8"
                          strokeDasharray={`${xpProgress * 2.64} 264`}
                        />
                      </svg>
                      <span className="desktop-level-num">{user.level}</span>
                    </div>
                    <div>
                      <p className="desktop-level-label">Explorer Level</p>
                      <p className="desktop-xp-text">{user.xp.toLocaleString()} / {user.xpToNext.toLocaleString()} XP</p>
                    </div>
                  </div>

                  <div className="desktop-stats-grid">
                    <div className="desktop-stat"><p className="stat-teal">{stats.countries}</p><span>Countries</span></div>
                    <div className="desktop-stat"><p className="stat-purple">{stats.cities}</p><span>Cities</span></div>
                    <div className="desktop-stat"><p className="stat-cyan">{stats.locations}</p><span>Places</span></div>
                    <div className="desktop-stat"><p className="stat-red">{user.streak}</p><span>Streak</span></div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="desktop-actions">
                  <Link href="/travel/locations/new" className="desktop-action action-teal">
                    <div className="desktop-action-icon"><Plus size={20} /></div>
                    <div className="desktop-action-text">
                      <p>Log a Visit</p>
                      <span>+15 XP per location</span>
                    </div>
                    <ChevronRight size={18} className="desktop-action-arrow" />
                  </Link>
                  <Link href="/travel/quests/new" className="desktop-action action-purple">
                    <div className="desktop-action-icon"><Compass size={20} /></div>
                    <div className="desktop-action-text">
                      <p>Plan a Quest</p>
                      <span>Create travel itinerary</span>
                    </div>
                    <ChevronRight size={18} className="desktop-action-arrow" />
                  </Link>
                  <Link href="/travel/map" className="desktop-action action-cyan">
                    <div className="desktop-action-icon"><Globe size={20} /></div>
                    <div className="desktop-action-text">
                      <p>World Map</p>
                      <span>See all your travels</span>
                    </div>
                    <ChevronRight size={18} className="desktop-action-arrow" />
                  </Link>
                </div>

                {/* Nav Links */}
                <div className="desktop-nav">
                  {[
                    { icon: <Building2 size={18} />, label: "Cities", href: "/travel/cities", count: stats.cities },
                    { icon: <MapPin size={18} />, label: "Locations", href: "/travel/locations", count: stats.locations },
                    { icon: <Heart size={18} />, label: "Hotlist", href: "/travel/hotlist", count: stats.hotlist },
                    { icon: <Scroll size={18} />, label: "Quests", href: "/travel/quests", count: activeQuests.length },
                    { icon: <Trophy size={18} />, label: "Achievements", href: "/travel/achievements", count: stats.achievements },
                  ].map((item) => (
                    <Link key={item.label} href={item.href} className="desktop-nav-item">
                      {item.icon}
                      <span>{item.label}</span>
                      <span className="desktop-nav-count">{item.count}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Center Column */}
              <div className="desktop-center">
                <div className="desktop-welcome">
                  <h1>Welcome back, Explorer!</h1>
                  <p>Ready to continue your adventure?</p>
                </div>

                {activeQuests.length > 0 && (
                  <div className="desktop-section">
                    <div className="section-header">
                      <h2 className="section-title">
                        <Target size={18} style={{ color: "var(--rpg-purple)" }} />
                        Active Quests
                      </h2>
                      <Link href="/travel/quests" className="section-link">View all</Link>
                    </div>

                    <div className="desktop-quests">
                      {activeQuests.map((quest) => {
                        const progressPct = quest.progress.total > 0
                          ? (quest.progress.completed / quest.progress.total) * 100
                          : 0;
                        return (
                          <Link key={quest.id} href={`/travel/quests/${quest.id}`} className="desktop-quest-card">
                            <div className="quest-header">
                              <div>
                                <h3 className="desktop-quest-name">{quest.name}</h3>
                                <p className="quest-cities">
                                  {quest.cities.map((c) => `${c.name}, ${c.country}`).join(" → ")}
                                </p>
                              </div>
                              <span className={`quest-status ${quest.status === "ACTIVE" ? "active" : "planning"}`}>
                                {quest.status === "ACTIVE" ? "In Progress" : "Planning"}
                              </span>
                            </div>
                            <div className="desktop-quest-progress">
                              <div className="quest-progress-bar">
                                <div className="quest-progress-fill" style={{ width: `${progressPct}%` }} />
                              </div>
                              <span>{quest.progress.completed} / {quest.progress.total}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="desktop-section">
                  <div className="section-header">
                    <h2 className="section-title">
                      <Clock size={18} style={{ color: "var(--rpg-muted)" }} />
                      Recent Visits
                    </h2>
                    <Link href="/travel/locations" className="section-link">View all</Link>
                  </div>

                  {recentVisits.length > 0 ? (
                    <div className="desktop-visits">
                      {recentVisits.map((visit) => (
                        <Link key={visit.id} href={`/travel/locations/${visit.location.id}`} className="desktop-visit">
                          <span className="visit-icon-lg">{getTypeIcon(visit.location.type)}</span>
                          <div className="visit-info">
                            <p className="visit-name">{visit.location.name}</p>
                            <p className="visit-location">{visit.location.city}, {visit.location.country}</p>
                          </div>
                          <span className="visit-time">{formatRelativeTime(visit.visitedAt)}</span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="desktop-empty">
                      <MapPin size={32} />
                      <p>No visits logged yet</p>
                      <Link href="/travel/locations/new" className="desktop-empty-cta">
                        <Plus size={16} /> Log your first visit
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div className="desktop-right">
                <Link href="/travel/achievements" className="desktop-achievements">
                  <div className="desktop-achievements-header">
                    <Trophy size={24} />
                    <div>
                      <p>Achievements</p>
                      <span>{stats.achievements} / {stats.totalAchievements} unlocked</span>
                    </div>
                  </div>
                  <div className="achievements-bar">
                    <div
                      className="achievements-fill"
                      style={{ width: `${stats.totalAchievements > 0 ? (stats.achievements / stats.totalAchievements) * 100 : 0}%` }}
                    />
                  </div>
                </Link>

                <div className="desktop-card-red">
                  <div className="desktop-card-header">
                    <Heart size={18} />
                    <p>Hotlist</p>
                    <Link href="/travel/hotlist" className="section-link">View all</Link>
                  </div>
                  <p className="desktop-card-value stat-red">{stats.hotlist}</p>
                  <span>places saved</span>
                </div>

                <div className="desktop-card-orange">
                  <div className="desktop-card-header">
                    <Flame size={18} />
                    <p>Current Streak</p>
                  </div>
                  <p className="desktop-card-value stat-orange">{user.streak}</p>
                  <span>{user.streak === 1 ? "day" : "days"} in a row</span>
                </div>
              </div>
            </div>
          </div>
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
          .desktop-container {
            max-width: 1280px;
            margin: 0 auto;
            padding: 32px;
          }
          .desktop-grid {
            display: grid;
            grid-template-columns: 280px 1fr 280px;
            gap: 32px;
          }

          .desktop-left, .desktop-right {
            display: flex;
            flex-direction: column;
            gap: 24px;
          }

          .desktop-level-card {
            padding: 24px;
            border-radius: 16px;
            background: linear-gradient(135deg, rgba(95, 191, 138, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%);
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          .desktop-level-header {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 16px;
          }
          .desktop-xp-ring {
            position: relative;
            width: 64px;
            height: 64px;
          }
          .desktop-level-num {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            font-weight: bold;
            color: var(--rpg-gold);
            text-shadow: 0 0 10px var(--rpg-gold-glow);
          }
          .desktop-level-label {
            font-size: 14px;
            color: var(--rpg-muted);
          }
          .desktop-xp-text {
            color: var(--rpg-text);
          }
          .desktop-stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .desktop-stat {
            padding: 12px;
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.2);
          }
          .desktop-stat p {
            font-size: 24px;
            font-weight: bold;
          }
          .desktop-stat span {
            font-size: 12px;
            color: var(--rpg-muted);
          }

          .desktop-actions {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .desktop-action {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            border-radius: 12px;
            border: 1px solid;
            transition: transform 0.2s, background 0.2s;
          }
          .desktop-action:hover { transform: scale(1.02); }
          .desktop-action.action-teal {
            background: rgba(95, 191, 138, 0.1);
            border-color: rgba(95, 191, 138, 0.3);
          }
          .desktop-action.action-teal:hover { background: rgba(95, 191, 138, 0.15); }
          .desktop-action.action-purple {
            background: rgba(168, 85, 247, 0.1);
            border-color: rgba(168, 85, 247, 0.3);
          }
          .desktop-action.action-purple:hover { background: rgba(168, 85, 247, 0.15); }
          .desktop-action.action-cyan {
            background: rgba(6, 182, 212, 0.1);
            border-color: rgba(6, 182, 212, 0.3);
          }
          .desktop-action.action-cyan:hover { background: rgba(6, 182, 212, 0.15); }
          .desktop-action-icon {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .desktop-action.action-teal .desktop-action-icon { background: rgba(95, 191, 138, 0.2); color: var(--rpg-teal); }
          .desktop-action.action-purple .desktop-action-icon { background: rgba(168, 85, 247, 0.2); color: var(--rpg-purple); }
          .desktop-action.action-cyan .desktop-action-icon { background: rgba(6, 182, 212, 0.2); color: var(--rpg-cyan); }
          .desktop-action-text {
            flex: 1;
          }
          .desktop-action-text p {
            font-weight: 500;
            color: var(--rpg-text);
          }
          .desktop-action-text span {
            font-size: 12px;
            color: var(--rpg-muted);
          }
          .desktop-action-arrow {
            color: var(--rpg-muted);
            transition: color 0.2s;
          }
          .desktop-action:hover .desktop-action-arrow { color: var(--rpg-text); }

          .desktop-nav {
            padding: 16px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.08);
          }
          .desktop-nav-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            border-radius: 8px;
            color: var(--rpg-muted);
            transition: background 0.2s, color 0.2s;
          }
          .desktop-nav-item:hover {
            background: rgba(255, 255, 255, 0.05);
            color: var(--rpg-text);
          }
          .desktop-nav-item span:first-of-type { flex: 1; }
          .desktop-nav-count {
            font-size: 14px;
            color: var(--rpg-muted);
          }

          .desktop-welcome {
            margin-bottom: 24px;
          }
          .desktop-welcome h1 {
            font-size: 24px;
            font-weight: bold;
            color: var(--rpg-text);
            margin-bottom: 4px;
          }
          .desktop-welcome p {
            color: var(--rpg-muted);
          }

          .desktop-section {
            margin-bottom: 24px;
          }
          .desktop-quests {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .desktop-quest-card {
            padding: 20px;
            border-radius: 12px;
            background: rgba(168, 85, 247, 0.08);
            border: 1px solid rgba(168, 85, 247, 0.2);
            transition: transform 0.2s;
          }
          .desktop-quest-card:hover { transform: scale(1.01); }
          .desktop-quest-name {
            font-size: 18px;
            color: var(--rpg-text);
          }
          .desktop-quest-progress {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .desktop-quest-progress .quest-progress-bar { flex: 1; }
          .desktop-quest-progress span {
            font-size: 14px;
            color: var(--rpg-muted);
            white-space: nowrap;
          }

          .desktop-visits {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .desktop-visit {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 16px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.08);
            transition: background 0.2s;
          }
          .desktop-visit:hover { background: rgba(255, 255, 255, 0.05); }

          .desktop-empty {
            padding: 32px;
            border-radius: 12px;
            text-align: center;
            background: rgba(255, 255, 255, 0.02);
            border: 1px dashed rgba(255, 255, 255, 0.1);
            color: var(--rpg-muted);
          }
          .desktop-empty p { margin: 12px 0 16px; }
          .desktop-empty-cta {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-radius: 8px;
            color: var(--rpg-teal);
            background: rgba(95, 191, 138, 0.1);
            transition: background 0.2s;
          }
          .desktop-empty-cta:hover { background: rgba(95, 191, 138, 0.2); }

          .desktop-achievements {
            display: block;
            padding: 20px;
            border-radius: 12px;
            background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 165, 0, 0.05) 100%);
            border: 1px solid rgba(255, 215, 0, 0.2);
            transition: transform 0.2s;
          }
          .desktop-achievements:hover { transform: scale(1.02); }
          .desktop-achievements-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
            color: var(--rpg-gold);
          }
          .desktop-achievements-header p {
            font-weight: 500;
            color: var(--rpg-text);
          }
          .desktop-achievements-header span {
            font-size: 14px;
            color: var(--rpg-muted);
          }
          .achievements-bar {
            height: 8px;
            border-radius: 4px;
            background: rgba(0, 0, 0, 0.3);
            overflow: hidden;
          }
          .achievements-fill {
            height: 100%;
            border-radius: 4px;
            background: linear-gradient(90deg, var(--rpg-gold) 0%, #f97316 100%);
          }

          .desktop-card-red, .desktop-card-orange {
            padding: 20px;
            border-radius: 12px;
          }
          .desktop-card-red {
            background: rgba(239, 68, 68, 0.05);
            border: 1px solid rgba(239, 68, 68, 0.2);
          }
          .desktop-card-orange {
            background: rgba(249, 115, 22, 0.05);
            border: 1px solid rgba(249, 115, 22, 0.2);
          }
          .desktop-card-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
          }
          .desktop-card-header p {
            flex: 1;
            font-weight: 500;
            color: var(--rpg-text);
          }
          .desktop-card-red .desktop-card-header { color: #ef4444; }
          .desktop-card-orange .desktop-card-header { color: #f97316; }
          .desktop-card-value {
            font-size: 36px;
            font-weight: bold;
            margin-bottom: 4px;
          }
          .desktop-card-red span, .desktop-card-orange span {
            font-size: 14px;
            color: var(--rpg-muted);
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
    </TravelApp>
  );
}
