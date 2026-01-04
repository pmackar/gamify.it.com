import Link from "next/link";
import {
  MapPin,
  Building2,
  Globe,
  Flame,
  Trophy,
  Plus,
  Map,
  Compass,
  Heart,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { getUser } from "@/lib/auth";
import prisma from "@/lib/db";
import AppLandingPage from "@/components/AppLandingPage";
import TravelHomeClient from "./TravelHomeClient";

const FEATURES = [
  {
    icon: <Map size={28} />,
    title: "Map Your World",
    description: "Track cities, neighborhoods, and locations you've visited",
  },
  {
    icon: <Compass size={28} />,
    title: "Rate & Review",
    description: "Remember your favorite spots with ratings and notes",
  },
  {
    icon: <Flame size={28} />,
    title: "Earn Exploration XP",
    description: "Every new place you log contributes to your level",
  },
  {
    icon: <Trophy size={28} />,
    title: "Achievement Hunting",
    description: "Unlock badges for reaching exploration milestones",
  },
];

async function getHomeData(userId: string) {
  try {
    const [
      achievementsCount,
      totalAchievements,
      hotlistCount,
      recentVisits,
      activeQuests,
      visitedLocations,
    ] = await Promise.all([
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
      // Recent visits with location details
      prisma.travel_visits.findMany({
        where: { user_id: userId },
        include: {
          location: {
            select: {
              id: true,
              name: true,
              type: true,
              city: { select: { name: true, country: true } },
            },
          },
        },
        orderBy: { date: "desc" },
        take: 5,
      }),
      // Active quests
      prisma.travel_quests.findMany({
        where: {
          user_id: userId,
          status: { in: ["PLANNING", "ACTIVE"] },
        },
        include: {
          cities: {
            include: { city: { select: { name: true, country: true } } },
            orderBy: { sort_order: "asc" },
            take: 2,
          },
          items: { select: { id: true, completed: true } },
        },
        orderBy: { updated_at: "desc" },
        take: 3,
      }),
      // Get locations the user has actually visited (for stats)
      prisma.travel_user_location_data.findMany({
        where: { user_id: userId, visited: true },
        include: {
          location: {
            select: {
              id: true,
              city: { select: { id: true, name: true, country: true } },
            },
          },
        },
      }),
    ]);

    // Calculate unique visited cities and countries
    const visitedCityIds = new Set<string>();
    const visitedCountries = new Set<string>();
    for (const v of visitedLocations) {
      if (v.location.city) {
        visitedCityIds.add(v.location.city.id);
        visitedCountries.add(v.location.city.country);
      }
    }

    return {
      stats: {
        countries: visitedCountries.size,
        cities: visitedCityIds.size,
        locations: visitedLocations.length,
        visits: visitedLocations.length,
        hotlist: hotlistCount,
        achievements: achievementsCount,
        totalAchievements,
      },
      recentVisits: recentVisits.map((v) => ({
        id: v.id,
        visitedAt: v.date.toISOString(),
        location: {
          id: v.location.id,
          name: v.location.name,
          type: v.location.type,
          city: v.location.city.name,
          country: v.location.city.country,
        },
      })),
      activeQuests: activeQuests.map((q) => ({
        id: q.id,
        name: q.name,
        status: q.status,
        cities: q.cities.map((c) => ({
          name: c.city.name,
          country: c.city.country,
        })),
        progress: {
          total: q.items.length,
          completed: q.items.filter((i) => i.completed).length,
        },
      })),
    };
  } catch (error) {
    console.error("Error fetching travel home data:", error);
    return {
      stats: {
        countries: 0,
        cities: 0,
        locations: 0,
        visits: 0,
        hotlist: 0,
        achievements: 0,
        totalAchievements: 0,
      },
      recentVisits: [],
      activeQuests: [],
    };
  }
}

export default async function TravelPage() {
  const user = await getUser();

  if (!user) {
    return (
      <AppLandingPage
        appId="travel"
        appName="Explorer"
        tagline="Turn Every Trip Into an Adventure"
        description="Log your travels, rate your discoveries, and unlock achievements as you explore the world."
        color="#5fbf8a"
        colorGlow="rgba(95, 191, 138, 0.3)"
        icon={<Globe size={64} strokeWidth={1.5} />}
        features={FEATURES}
        tryPath="/travel/demo"
      />
    );
  }

  const data = await getHomeData(user.id);

  return (
    <TravelHomeClient
      user={{
        level: user.travel.level,
        xp: user.travel.xp,
        xpToNext: user.travel.xpToNext,
        streak: user.currentStreak,
      }}
      stats={data.stats}
      recentVisits={data.recentVisits}
      activeQuests={data.activeQuests}
    />
  );
}
