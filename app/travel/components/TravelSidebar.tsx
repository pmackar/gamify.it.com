"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Globe,
  Map,
  Building2,
  MapPin,
  Heart,
  Scroll,
  Trophy,
  Plus,
  Compass,
} from "lucide-react";

interface TravelSidebarProps {
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
    activeQuests: number;
  };
}

export default function TravelSidebar({ user, stats }: TravelSidebarProps) {
  const pathname = usePathname();
  const xpProgress = user.xpToNext > 0 ? (user.xp / user.xpToNext) * 100 : 100;

  const navItems = [
    { icon: <Map size={18} />, label: "World Map", href: "/travel/map" },
    { icon: <Building2 size={18} />, label: "Cities", href: "/travel/cities", count: stats.cities },
    { icon: <MapPin size={18} />, label: "Locations", href: "/travel/locations", count: stats.locations },
    { icon: <Heart size={18} />, label: "Hotlist", href: "/travel/hotlist", count: stats.hotlist },
    { icon: <Scroll size={18} />, label: "Quests", href: "/travel/quests", count: stats.activeQuests },
    { icon: <Trophy size={18} />, label: "Achievements", href: "/travel/achievements", count: `${stats.achievements}/${stats.totalAchievements}` },
  ];

  return (
    <aside className="travel-sidebar">
      {/* Character Card */}
      <div className="sidebar-header">
        <div className="character-card">
          <div className="character-top">
            <div className="character-avatar">
              <Globe size={24} />
              <span className="level-badge">{user.level}</span>
            </div>
            <div className="character-info">
              <div className="character-rank">EXPLORER</div>
              <div className="character-title">World Traveler</div>
            </div>
          </div>

          <div className="xp-section">
            <div className="xp-label">
              <span>EXPERIENCE</span>
              <span className="xp-value">{user.xp} / {user.xpToNext}</span>
            </div>
            <div className="xp-bar">
              <div className="xp-bar-fill" style={{ width: `${xpProgress}%` }} />
            </div>
          </div>

          <div className="stat-badges">
            <div className="stat-badge">
              <span className="stat-badge-icon">🔥</span>
              <div>
                <div className="stat-badge-value">{user.streak}</div>
                <div className="stat-badge-label">Streak</div>
              </div>
            </div>
            <div className="stat-badge">
              <span className="stat-badge-icon">🌍</span>
              <div>
                <div className="stat-badge-value">{stats.countries}</div>
                <div className="stat-badge-label">Countries</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="sidebar-actions">
        <Link href="/travel/locations/new" className="sidebar-action action-teal">
          <Plus size={18} />
          <span>Log Visit</span>
          <span className="action-xp">+15 XP</span>
        </Link>
        <Link href="/travel/quests/new" className="sidebar-action action-purple">
          <Compass size={18} />
          <span>New Quest</span>
        </Link>
      </div>

      {/* Navigation - grows to fill space */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/travel" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`nav-item ${isActive ? "nav-item-active" : ""}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.count !== undefined && (
                <span className="nav-count">{item.count}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Stats - anchored to bottom */}
      <div className="sidebar-footer">
        <div className="footer-stat">
          <span className="footer-stat-value stat-purple">{stats.cities}</span>
          <span className="footer-stat-label">Cities</span>
        </div>
        <div className="footer-stat">
          <span className="footer-stat-value stat-cyan">{stats.locations}</span>
          <span className="footer-stat-label">Places</span>
        </div>
        <div className="footer-stat">
          <span className="footer-stat-value stat-teal">{stats.visits}</span>
          <span className="footer-stat-label">Visits</span>
        </div>
      </div>

      <style jsx>{`
        .travel-sidebar {
          width: 280px;
          height: 100vh;
          position: fixed;
          top: 0;
          /* Position sidebar to align with navbar's left edge (centered 1000px container) */
          left: max(0px, calc((100vw - 1000px) / 2));
          background: var(--rpg-card);
          border-right: 1px solid var(--rpg-border);
          display: flex;
          flex-direction: column;
          z-index: 40;
          padding-top: var(--content-top, 60px);
        }

        .sidebar-header {
          padding: 20px;
          flex-shrink: 0;
        }

        .character-card {
          background: linear-gradient(180deg, var(--rpg-bg) 0%, var(--rpg-card) 100%);
          border: 1px solid var(--rpg-border);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 4px 0 rgba(0, 0, 0, 0.2);
        }

        .character-top {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .character-avatar {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--rpg-teal), var(--rpg-purple));
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          border: 2px solid var(--rpg-teal);
          box-shadow: 0 0 15px var(--rpg-teal-glow);
          color: white;
        }

        .level-badge {
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(180deg, var(--rpg-gold), #E6A000);
          color: #1a1a1a;
          font-size: 10px;
          font-weight: 700;
          min-width: 24px;
          height: 18px;
          padding: 0 6px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 0 #996600;
        }

        .character-info {
          flex: 1;
        }

        .character-rank {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--rpg-teal);
          text-shadow: 0 0 8px var(--rpg-teal-glow);
          font-family: var(--font-title);
        }

        .character-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--rpg-text);
          font-family: var(--font-subtitle);
        }

        .xp-section {
          margin-bottom: 12px;
        }

        .xp-label {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--rpg-muted);
          margin-bottom: 6px;
          font-family: var(--font-title);
        }

        .xp-value {
          color: var(--rpg-gold);
          text-shadow: 0 0 8px var(--rpg-gold-glow);
        }

        .xp-bar {
          height: 6px;
          background: var(--rpg-border);
          border-radius: 3px;
          overflow: hidden;
        }

        .xp-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--rpg-teal) 0%, var(--rpg-purple) 100%);
          border-radius: 3px;
          transition: width 0.3s ease;
          box-shadow: 0 0 8px var(--rpg-teal-glow);
        }

        .stat-badges {
          display: flex;
          gap: 8px;
        }

        .stat-badge {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          background: var(--rpg-bg);
          border: 1px solid var(--rpg-border);
          border-radius: 8px;
        }

        .stat-badge-icon {
          font-size: 16px;
        }

        .stat-badge-value {
          font-size: 14px;
          font-weight: 600;
          color: var(--rpg-text);
          font-family: var(--font-subtitle);
        }

        .stat-badge-label {
          font-size: 9px;
          text-transform: uppercase;
          color: var(--rpg-muted);
          letter-spacing: 0.5px;
          font-family: var(--font-title);
        }

        /* Quick Actions */
        .sidebar-actions {
          padding: 0 20px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex-shrink: 0;
        }

        .sidebar-action {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          border: 1px solid;
          font-family: var(--font-subtitle);
        }

        .sidebar-action.action-teal {
          background: rgba(95, 191, 138, 0.1);
          border-color: rgba(95, 191, 138, 0.3);
          color: var(--rpg-teal);
        }
        .sidebar-action.action-teal:hover {
          background: rgba(95, 191, 138, 0.2);
        }

        .sidebar-action.action-purple {
          background: rgba(168, 85, 247, 0.1);
          border-color: rgba(168, 85, 247, 0.3);
          color: var(--rpg-purple);
        }
        .sidebar-action.action-purple:hover {
          background: rgba(168, 85, 247, 0.2);
        }

        .sidebar-action span:first-of-type {
          flex: 1;
        }

        .action-xp {
          font-size: 12px;
          color: var(--rpg-gold);
        }

        /* Navigation */
        .sidebar-nav {
          flex: 1;
          padding: 0 12px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 8px;
          color: var(--rpg-muted);
          font-size: 14px;
          font-weight: 500;
          transition: all 0.15s ease;
          font-family: var(--font-subtitle);
        }

        .nav-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--rpg-text);
        }

        .nav-item-active {
          background: rgba(95, 191, 138, 0.1);
          color: var(--rpg-teal);
        }

        .nav-icon {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        .nav-label {
          flex: 1;
        }

        .nav-count {
          font-size: 12px;
          padding: 2px 8px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          color: var(--rpg-muted);
        }

        /* Footer - anchored to bottom */
        .sidebar-footer {
          padding: 16px 20px;
          border-top: 1px solid var(--rpg-border);
          display: flex;
          justify-content: space-around;
          flex-shrink: 0;
          margin-top: auto;
        }

        .footer-stat {
          text-align: center;
        }

        .footer-stat-value {
          font-size: 20px;
          font-weight: bold;
          display: block;
          font-family: var(--font-subtitle);
        }

        .footer-stat-label {
          font-size: 10px;
          color: var(--rpg-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-family: var(--font-title);
        }

        .stat-purple {
          color: var(--rpg-purple);
        }

        .stat-cyan {
          color: var(--rpg-cyan);
        }

        .stat-teal {
          color: var(--rpg-teal);
        }

        /* Hide on mobile */
        @media (max-width: 1023px) {
          .travel-sidebar {
            display: none;
          }
        }
      `}</style>
    </aside>
  );
}
