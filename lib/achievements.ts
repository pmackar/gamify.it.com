import prisma from "@/lib/db";
import { addXP } from "./gamification";

export interface AchievementDef {
  code: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  category: string;
  tier: number;
  criteria: {
    type: string;
    count?: number;
    locationType?: string;
  };
}

// Achievement definitions
export const ACHIEVEMENTS: AchievementDef[] = [
  // EXPLORATION
  { code: "first_steps", name: "First Steps", description: "Log your first location", icon: "footprints", xpReward: 100, category: "exploration", tier: 1, criteria: { type: "locations_count", count: 1 } },
  { code: "explorer", name: "Explorer", description: "Visit 10 unique locations", icon: "compass", xpReward: 250, category: "exploration", tier: 1, criteria: { type: "locations_count", count: 10 } },
  { code: "adventurer", name: "Adventurer", description: "Visit 50 unique locations", icon: "map", xpReward: 500, category: "exploration", tier: 2, criteria: { type: "locations_count", count: 50 } },
  { code: "globetrotter", name: "Globetrotter", description: "Visit 100 unique locations", icon: "globe", xpReward: 1000, category: "exploration", tier: 3, criteria: { type: "locations_count", count: 100 } },

  // CITIES
  { code: "city_hopper", name: "City Hopper", description: "Visit 3 different cities", icon: "building", xpReward: 300, category: "exploration", tier: 1, criteria: { type: "cities_count", count: 3 } },
  { code: "city_slicker", name: "City Slicker", description: "Visit 10 different cities", icon: "buildings", xpReward: 750, category: "exploration", tier: 2, criteria: { type: "cities_count", count: 10 } },
  { code: "cosmopolitan", name: "Cosmopolitan", description: "Visit 25 different cities", icon: "sparkles", xpReward: 1500, category: "exploration", tier: 3, criteria: { type: "cities_count", count: 25 } },

  // COUNTRIES
  { code: "border_crosser", name: "Border Crosser", description: "Visit 2 different countries", icon: "plane", xpReward: 500, category: "exploration", tier: 2, criteria: { type: "countries_count", count: 2 } },
  { code: "world_traveler", name: "World Traveler", description: "Visit 5 different countries", icon: "airplane", xpReward: 1000, category: "exploration", tier: 3, criteria: { type: "countries_count", count: 5 } },
  { code: "international", name: "International", description: "Visit 10 different countries", icon: "earth", xpReward: 2000, category: "exploration", tier: 4, criteria: { type: "countries_count", count: 10 } },

  // FOODIE
  { code: "first_bite", name: "First Bite", description: "Rate your first restaurant", icon: "utensils", xpReward: 100, category: "foodie", tier: 1, criteria: { type: "location_type_count", locationType: "RESTAURANT", count: 1 } },
  { code: "food_critic", name: "Food Critic", description: "Rate 25 restaurants", icon: "star", xpReward: 500, category: "foodie", tier: 2, criteria: { type: "location_type_count", locationType: "RESTAURANT", count: 25 } },
  { code: "connoisseur", name: "Connoisseur", description: "Rate 100 restaurants", icon: "chef-hat", xpReward: 1500, category: "foodie", tier: 3, criteria: { type: "location_type_count", locationType: "RESTAURANT", count: 100 } },

  // BAR
  { code: "bar_hopper", name: "Bar Hopper", description: "Visit 10 different bars", icon: "beer", xpReward: 300, category: "nightlife", tier: 1, criteria: { type: "location_type_count", locationType: "BAR", count: 10 } },
  { code: "mixologist", name: "Mixologist", description: "Visit 50 different bars", icon: "cocktail", xpReward: 750, category: "nightlife", tier: 2, criteria: { type: "location_type_count", locationType: "BAR", count: 50 } },

  // NATURE
  { code: "nature_lover", name: "Nature Lover", description: "Visit 10 nature spots", icon: "tree", xpReward: 400, category: "nature", tier: 1, criteria: { type: "location_type_count", locationType: "NATURE", count: 10 } },
  { code: "wilderness_explorer", name: "Wilderness Explorer", description: "Visit 25 nature spots", icon: "mountain", xpReward: 800, category: "nature", tier: 2, criteria: { type: "location_type_count", locationType: "NATURE", count: 25 } },

  // STREAKS
  { code: "consistent", name: "Consistent", description: "Maintain a 7-day streak", icon: "flame", xpReward: 300, category: "streak", tier: 1, criteria: { type: "streak_days", count: 7 } },
  { code: "dedicated", name: "Dedicated", description: "Maintain a 30-day streak", icon: "fire", xpReward: 1000, category: "streak", tier: 2, criteria: { type: "streak_days", count: 30 } },
  { code: "unstoppable", name: "Unstoppable", description: "Maintain a 100-day streak", icon: "trophy", xpReward: 3000, category: "streak", tier: 3, criteria: { type: "streak_days", count: 100 } },

  // MILESTONES
  { code: "level_5", name: "Rising Star", description: "Reach Level 5", icon: "star", xpReward: 300, category: "milestone", tier: 1, criteria: { type: "level", count: 5 } },
  { code: "level_10", name: "Veteran Traveler", description: "Reach Level 10", icon: "medal", xpReward: 600, category: "milestone", tier: 2, criteria: { type: "level", count: 10 } },
  { code: "level_25", name: "Elite Explorer", description: "Reach Level 25", icon: "crown", xpReward: 1500, category: "milestone", tier: 3, criteria: { type: "level", count: 25 } },

  // MUSEUMS & ATTRACTIONS
  { code: "culture_vulture", name: "Culture Vulture", description: "Visit 10 museums", icon: "landmark", xpReward: 400, category: "culture", tier: 1, criteria: { type: "location_type_count", locationType: "MUSEUM", count: 10 } },
  { code: "tourist", name: "Tourist", description: "Visit 20 attractions", icon: "camera", xpReward: 500, category: "culture", tier: 2, criteria: { type: "location_type_count", locationType: "ATTRACTION", count: 20 } },

  // BEACH
  { code: "beach_bum", name: "Beach Bum", description: "Visit 5 beaches", icon: "umbrella-beach", xpReward: 300, category: "nature", tier: 1, criteria: { type: "location_type_count", locationType: "BEACH", count: 5 } },
  { code: "coastal_explorer", name: "Coastal Explorer", description: "Visit 15 beaches", icon: "waves", xpReward: 600, category: "nature", tier: 2, criteria: { type: "location_type_count", locationType: "BEACH", count: 15 } },
];

export async function checkAchievements(userId: string): Promise<AchievementDef[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      achievements: { include: { achievement: true } },
      cities: true,
      locations: true,
    },
  });

  if (!user) return [];

  const unlockedCodes = new Set(user.achievements.map((ua: { achievement: { code: string } }) => ua.achievement.code));
  const newAchievements: AchievementDef[] = [];

  // Get stats for checking
  const stats = {
    locationsCount: user.locations.length,
    citiesCount: user.cities.length,
    countriesCount: new Set(user.cities.map((c: { country: string }) => c.country)).size,
    currentStreak: user.currentStreak,
    level: user.level,
    locationTypeCounts: {} as Record<string, number>,
  };

  // Count by location type
  for (const location of user.locations) {
    const type = location.type;
    stats.locationTypeCounts[type] = (stats.locationTypeCounts[type] || 0) + 1;
  }

  // Check each achievement
  for (const achievement of ACHIEVEMENTS) {
    if (unlockedCodes.has(achievement.code)) continue;

    let unlocked = false;
    const { type, count, locationType } = achievement.criteria;

    switch (type) {
      case "locations_count":
        unlocked = stats.locationsCount >= (count || 0);
        break;
      case "cities_count":
        unlocked = stats.citiesCount >= (count || 0);
        break;
      case "countries_count":
        unlocked = stats.countriesCount >= (count || 0);
        break;
      case "streak_days":
        unlocked = stats.currentStreak >= (count || 0);
        break;
      case "level":
        unlocked = stats.level >= (count || 0);
        break;
      case "location_type_count":
        unlocked = (stats.locationTypeCounts[locationType || ""] || 0) >= (count || 0);
        break;
    }

    if (unlocked) {
      // Find or create achievement in DB
      let dbAchievement = await prisma.achievement.findUnique({
        where: { code: achievement.code },
      });

      if (!dbAchievement) {
        dbAchievement = await prisma.achievement.create({
          data: {
            code: achievement.code,
            name: achievement.name,
            description: achievement.description,
            icon: achievement.icon,
            xpReward: achievement.xpReward,
            category: achievement.category,
            tier: achievement.tier,
            criteria: achievement.criteria,
          },
        });
      }

      // Create user achievement record
      await prisma.userAchievement.create({
        data: {
          userId,
          achievementId: dbAchievement.id,
        },
      });

      // Award XP
      await addXP(userId, achievement.xpReward);
      newAchievements.push(achievement);
    }
  }

  return newAchievements;
}

// Seed achievements to database
export async function seedAchievements(): Promise<void> {
  for (const achievement of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { code: achievement.code },
      update: {
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        xpReward: achievement.xpReward,
        category: achievement.category,
        tier: achievement.tier,
        criteria: achievement.criteria,
      },
      create: {
        code: achievement.code,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        xpReward: achievement.xpReward,
        category: achievement.category,
        tier: achievement.tier,
        criteria: achievement.criteria,
      },
    });
  }
}
