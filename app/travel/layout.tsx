import type { Metadata } from 'next';
import { getUser } from "@/lib/auth";
import prisma from "@/lib/db";
import TravelSidebar from "./components/TravelSidebar";
import TravelHeader from "./components/TravelHeader";
import TravelApp from "./TravelApp";

export const metadata: Metadata = {
  title: 'Explorer | gamify.it.com',
  description: 'Track your travels, rate discoveries, and unlock achievements as you explore the world.',
};

async function getSidebarData(userId: string) {
  try {
    const [
      citiesCount,
      locationsCount,
      visitsCount,
      achievementsCount,
      totalAchievements,
      hotlistCount,
      activeQuestsCount,
      cities,
    ] = await Promise.all([
      prisma.travel_cities.count({ where: { user_id: userId } }),
      prisma.travel_locations.count({ where: { user_id: userId } }),
      prisma.travel_visits.count({ where: { user_id: userId } }),
      prisma.user_achievements.count({
        where: {
          user_id: userId,
          is_completed: true,
          achievements: { app_id: "travel" },
        },
      }),
      prisma.achievements.count({ where: { app_id: "travel" } }),
      prisma.travel_user_location_data.count({
        where: { user_id: userId, hotlist: true },
      }),
      prisma.travel_quests.count({
        where: {
          user_id: userId,
          status: { in: ["PLANNING", "ACTIVE"] },
        },
      }),
      prisma.travel_cities.findMany({
        where: { user_id: userId },
        select: { country: true },
      }),
    ]);

    const uniqueCountries = new Set(cities.map((c) => c.country));

    return {
      countries: uniqueCountries.size,
      cities: citiesCount,
      locations: locationsCount,
      visits: visitsCount,
      hotlist: hotlistCount,
      achievements: achievementsCount,
      totalAchievements,
      activeQuests: activeQuestsCount,
    };
  } catch (error) {
    console.error("Error fetching sidebar data:", error);
    return {
      countries: 0,
      cities: 0,
      locations: 0,
      visits: 0,
      hotlist: 0,
      achievements: 0,
      totalAchievements: 0,
      activeQuests: 0,
    };
  }
}

export default async function TravelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  const isLoggedIn = !!user;
  const stats = isLoggedIn ? await getSidebarData(user.id) : null;

  return (
    <>
      <style>{`
        .travel-layout {
          min-height: 100vh;
          min-height: 100dvh;
          background: var(--theme-bg-base);
          color: var(--theme-text-primary);
          font-family: var(--font-body);
        }

        /* Desktop layout - match navbar padding (16px from edges) */
        @media (min-width: 1024px) {
          .travel-main-content {
            padding-top: var(--content-top);
            min-height: 100vh;
            /* Right: match navbar outer padding */
            padding-right: 16px;
          }

          /* Only add left padding when sidebar is showing */
          .travel-layout.has-sidebar .travel-main-content {
            /* Left: clear sidebar (280px) + 16px gap */
            padding-left: 296px;
          }
        }

        /* Mobile layout */
        @media (max-width: 1023px) {
          .travel-layout {
            padding-top: var(--content-top);
            padding-bottom: calc(var(--command-bar-height, 100px) + 20px);
          }
          .travel-main-content {
            padding: 16px;
          }
        }

        /* Light theme adjustments */
        :global(html.light) .travel-layout {
          background: var(--theme-bg-base);
        }
      `}</style>

      <div className={`travel-layout ${isLoggedIn ? 'has-sidebar' : ''}`}>
        {/* Desktop Sidebar - only for logged in users */}
        {isLoggedIn && stats && (
          <TravelSidebar
            user={{
              level: user.travel.level,
              xp: user.travel.xp,
              xpToNext: user.travel.xpToNext,
              streak: user.currentStreak,
            }}
            stats={stats}
          />
        )}

        {/* Main content area */}
        <div className="travel-main-content">
          {/* Back button and breadcrumbs - consistent across all pages */}
          <TravelHeader />

          <TravelApp isLoggedIn={isLoggedIn}>
            {children}
          </TravelApp>
        </div>
      </div>
    </>
  );
}
