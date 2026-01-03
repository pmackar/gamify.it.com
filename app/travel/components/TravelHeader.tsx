"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Home } from "lucide-react";

// Map path segments to display names
const SEGMENT_NAMES: Record<string, string> = {
  travel: "Explorer",
  cities: "Cities",
  locations: "Locations",
  quests: "Quests",
  hotlist: "Hotlist",
  map: "Map",
  achievements: "Achievements",
  profile: "Profile",
  neighborhoods: "Neighborhoods",
  new: "New",
  suggestions: "Suggestions",
  demo: "Demo",
};

interface Breadcrumb {
  label: string;
  href: string;
  isLast: boolean;
}

export default function TravelHeader() {
  const pathname = usePathname();
  const router = useRouter();

  // Don't show on main travel page
  if (pathname === "/travel") {
    return null;
  }

  // Parse path into breadcrumbs
  const segments = pathname?.split("/").filter(Boolean) || [];
  const breadcrumbs: Breadcrumb[] = [];

  let currentPath = "";
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;

    // Get display name
    let label = SEGMENT_NAMES[segment];

    // If not in our map, it's likely a dynamic segment (ID)
    if (!label) {
      // Show truncated ID or placeholder
      if (segment.length > 12) {
        label = segment.substring(0, 8) + "...";
      } else {
        label = segment;
      }
    }

    breadcrumbs.push({
      label,
      href: currentPath,
      isLast,
    });
  });

  // Calculate back URL (parent path)
  const backUrl = segments.length > 1
    ? "/" + segments.slice(0, -1).join("/")
    : "/travel";

  return (
    <div className="travel-header">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="back-button"
        aria-label="Go back"
      >
        <ChevronLeft size={20} />
        <span>Back</span>
      </button>

      {/* Breadcrumbs */}
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb.href} className="breadcrumb-item">
            {index > 0 && (
              <ChevronRight size={14} className="breadcrumb-separator" />
            )}
            {crumb.isLast ? (
              <span className="breadcrumb-current">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="breadcrumb-link">
                {index === 0 ? (
                  <Home size={14} className="breadcrumb-home" />
                ) : null}
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      <style jsx>{`
        .travel-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 0;
          margin-bottom: 8px;
        }

        .back-button {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
          background: var(--rpg-card);
          border: 1px solid var(--rpg-border);
          border-radius: 8px;
          color: var(--rpg-muted);
          font-size: 14px;
          font-family: var(--font-subtitle);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .back-button:hover {
          background: var(--rpg-border);
          color: var(--rpg-text);
        }

        .breadcrumbs {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 4px;
          font-size: 13px;
          font-family: var(--font-subtitle);
        }

        .breadcrumb-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .breadcrumb-separator {
          color: var(--rpg-muted);
          opacity: 0.5;
        }

        .breadcrumb-link {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--rpg-muted);
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .breadcrumb-link:hover {
          color: var(--rpg-teal);
        }

        .breadcrumb-home {
          opacity: 0.7;
        }

        .breadcrumb-current {
          color: var(--rpg-text);
          font-weight: 500;
        }

        /* Mobile adjustments */
        @media (max-width: 640px) {
          .travel-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .back-button span {
            display: none;
          }

          .back-button {
            padding: 8px;
          }

          .breadcrumbs {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}
