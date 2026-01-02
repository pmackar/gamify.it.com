'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BreadcrumbItem {
  label: string;
  href: string;
  isLast: boolean;
}

// Map of static routes to display names
const ROUTE_NAMES: Record<string, string> = {
  travel: 'Explorer',
  cities: 'Cities',
  locations: 'Locations',
  neighborhoods: 'Neighborhoods',
  achievements: 'Achievements',
  profile: 'Profile',
  map: 'Map',
  new: 'Add New',
};

export default function TravelBreadcrumb() {
  const pathname = usePathname();
  const [dynamicNames, setDynamicNames] = useState<Record<string, string>>({});

  // Parse pathname into segments
  const segments = pathname?.split('/').filter(Boolean) || [];

  // Fetch dynamic names for IDs
  useEffect(() => {
    async function fetchNames() {
      const newNames: Record<string, string> = {};

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const prevSegment = segments[i - 1];

        // Skip if it's a known static route
        if (ROUTE_NAMES[segment]) continue;

        // Check if this looks like a dynamic segment (UUID or similar)
        if (segment.length > 10 && !ROUTE_NAMES[segment]) {
          try {
            if (prevSegment === 'cities') {
              const res = await fetch(`/api/cities/${segment}`);
              if (res.ok) {
                const city = await res.json();
                newNames[segment] = city.name;
              }
            } else if (prevSegment === 'locations') {
              const res = await fetch(`/api/locations/${segment}`);
              if (res.ok) {
                const location = await res.json();
                newNames[segment] = location.name;
              }
            } else if (prevSegment === 'neighborhoods') {
              const res = await fetch(`/api/neighborhoods/${segment}`);
              if (res.ok) {
                const neighborhood = await res.json();
                newNames[segment] = neighborhood.name;
              }
            }
          } catch (e) {
            // Ignore fetch errors
          }
        }
      }

      if (Object.keys(newNames).length > 0) {
        setDynamicNames(prev => ({ ...prev, ...newNames }));
      }
    }

    fetchNames();
  }, [pathname]);

  // Don't show breadcrumb on the main travel page
  if (segments.length <= 1) return null;

  // Build breadcrumb items
  const items: BreadcrumbItem[] = [];
  let currentPath = '';

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    // Get display name
    let label = ROUTE_NAMES[segment] || dynamicNames[segment] || segment;

    // Truncate long names
    if (label.length > 20) {
      label = label.substring(0, 18) + '...';
    }

    items.push({
      label,
      href: currentPath,
      isLast: i === segments.length - 1,
    });
  }

  return (
    <>
      <style jsx>{`
        .breadcrumb-container {
          background: var(--theme-bg-elevated);
          border-bottom: 1px solid var(--theme-border);
          padding: 12px 24px;
        }

        .breadcrumb-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .breadcrumb-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .breadcrumb-link {
          font-family: var(--font-pixel, 'Press Start 2P', monospace);
          font-size: 0.5rem;
          color: var(--theme-text-muted);
          text-decoration: none;
          transition: color 0.15s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .breadcrumb-link:hover {
          color: var(--app-travel);
        }

        .breadcrumb-current {
          font-family: var(--font-pixel, 'Press Start 2P', monospace);
          font-size: 0.5rem;
          color: var(--theme-text-primary);
        }

        .breadcrumb-separator {
          color: var(--theme-text-muted);
          opacity: 0.5;
        }

        .home-icon {
          width: 14px;
          height: 14px;
        }

        .separator-icon {
          width: 12px;
          height: 12px;
        }
      `}</style>

      <nav className="breadcrumb-container">
        <div className="breadcrumb-content">
          {items.map((item, index) => (
            <div key={item.href} className="breadcrumb-item">
              {index > 0 && (
                <ChevronRight className="separator-icon breadcrumb-separator" />
              )}
              {item.isLast ? (
                <span className="breadcrumb-current">
                  {index === 0 && <Home className="home-icon" style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />}
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="breadcrumb-link">
                  {index === 0 && <Home className="home-icon" />}
                  {item.label}
                </Link>
              )}
            </div>
          ))}
        </div>
      </nav>
    </>
  );
}
