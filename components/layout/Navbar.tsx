"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Map,
  Compass,
  Trophy,
  BarChart3,
  User,
  LogOut,
  Menu,
  X,
  MapPin,
  Building2,
} from "lucide-react";
import XPBar from "@/components/ui/XPBar";
import type { Profile } from "@/lib/supabase/types";

interface NavbarProps {
  user: Profile;
}

export default function Navbar({ user }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: Compass },
    { href: "/cities", label: "Cities", icon: Building2 },
    { href: "/locations", label: "Locations", icon: MapPin },
    { href: "/map", label: "Map", icon: Map },
    { href: "/achievements", label: "Achieve", icon: Trophy },
    { href: "/stats", label: "Stats", icon: BarChart3 },
  ];

  const isActive = (href: string) => pathname === href;

  const handleSignOut = async () => {
    // Navigate to logout route
    router.push("/auth/logout");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50" style={{ background: 'var(--rpg-card)', borderBottom: '2px solid var(--rpg-border)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, var(--rpg-teal) 0%, var(--rpg-gold) 100%)',
                border: '2px solid var(--rpg-teal-dark)'
              }}
            >
              <Compass className="w-4 h-4" style={{ color: 'var(--rpg-bg-dark)' }} />
            </div>
            <span
              className="hidden sm:block text-xs"
              style={{ color: 'var(--rpg-teal)', textShadow: '0 0 10px var(--rpg-teal-glow)' }}
            >
              gamify.it.com
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded text-[0.55rem] transition-all"
                style={{
                  color: isActive(link.href) ? 'var(--rpg-gold)' : 'var(--rpg-muted)',
                  background: isActive(link.href) ? 'rgba(255, 215, 0, 0.1)' : 'transparent',
                  textShadow: isActive(link.href) ? '0 0 8px var(--rpg-gold-glow)' : 'none',
                }}
              >
                <link.icon className="w-3.5 h-3.5" />
                {link.label}
              </Link>
            ))}
          </div>

          {/* User Section */}
          <div className="flex items-center gap-3">
            {/* XP Bar - Desktop only */}
            <div className="hidden lg:block w-28">
              <XPBar
                level={user.main_level || 1}
                currentXP={user.total_xp || 0}
                xpToNext={100}
                showLabel={false}
                size="sm"
              />
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className="flex items-center gap-2 px-2 py-1 rounded transition-all"
                style={{ background: 'var(--rpg-bg-dark)', border: '1px solid var(--rpg-border)' }}
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.display_name || "User"}
                    className="w-6 h-6 rounded pixel-art"
                    style={{ border: '2px solid var(--rpg-teal)' }}
                  />
                ) : (
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center"
                    style={{ background: 'var(--rpg-teal)', border: '2px solid var(--rpg-teal-dark)' }}
                  >
                    <User className="w-3 h-3" style={{ color: 'var(--rpg-bg-dark)' }} />
                  </div>
                )}
                <span
                  className="hidden sm:block text-[0.5rem]"
                  style={{ color: 'var(--rpg-gold)' }}
                >
                  LVL {user.main_level || 1}
                </span>
              </Link>

              <button
                onClick={handleSignOut}
                className="p-1.5 rounded transition-all"
                style={{
                  color: 'var(--rpg-muted)',
                  border: '1px solid var(--rpg-border)',
                  background: 'var(--rpg-bg-dark)'
                }}
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded"
              style={{
                color: 'var(--rpg-teal)',
                border: '2px solid var(--rpg-border)',
                background: 'var(--rpg-bg-dark)'
              }}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div style={{ background: 'var(--rpg-bg)', borderTop: '2px solid var(--rpg-border)' }}>
          <div className="px-4 py-4 space-y-2">
            <div className="pb-4 mb-4" style={{ borderBottom: '1px solid var(--rpg-border)' }}>
              <XPBar
                level={user.main_level || 1}
                currentXP={user.total_xp || 0}
                xpToNext={100}
                size="sm"
              />
            </div>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded text-[0.6rem] transition-all"
                style={{
                  color: isActive(link.href) ? 'var(--rpg-gold)' : 'var(--rpg-muted)',
                  background: isActive(link.href) ? 'rgba(255, 215, 0, 0.1)' : 'var(--rpg-card)',
                  border: `2px solid ${isActive(link.href) ? 'var(--rpg-gold)' : 'var(--rpg-border)'}`,
                }}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
