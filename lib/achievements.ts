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

// Achievement definitions for travel app
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

  // SOCIAL - FRIENDS
  { code: "first_friend", name: "First Friend", description: "Add your first friend", icon: "handshake", xpReward: 100, category: "social", tier: 1, criteria: { type: "friends_count", count: 1 } },
  { code: "social_butterfly", name: "Social Butterfly", description: "Have 5 friends", icon: "users", xpReward: 250, category: "social", tier: 1, criteria: { type: "friends_count", count: 5 } },
  { code: "networker", name: "Networker", description: "Have 10 friends", icon: "network", xpReward: 500, category: "social", tier: 2, criteria: { type: "friends_count", count: 10 } },
  { code: "influencer", name: "Influencer", description: "Have 25 friends", icon: "star", xpReward: 1000, category: "social", tier: 3, criteria: { type: "friends_count", count: 25 } },
  { code: "connector", name: "Connector", description: "Have 50 friends", icon: "heart", xpReward: 2000, category: "social", tier: 4, criteria: { type: "friends_count", count: 50 } },

  // SOCIAL - PARTIES
  { code: "party_starter", name: "Party Starter", description: "Create your first quest party", icon: "party", xpReward: 150, category: "social", tier: 1, criteria: { type: "parties_created", count: 1 } },
  { code: "team_player", name: "Team Player", description: "Join 3 quest parties", icon: "users-group", xpReward: 300, category: "social", tier: 1, criteria: { type: "parties_joined", count: 3 } },
  { code: "squad_goals", name: "Squad Goals", description: "Complete a quest with a party", icon: "trophy", xpReward: 500, category: "social", tier: 2, criteria: { type: "party_quests_completed", count: 1 } },
  { code: "party_animal", name: "Party Animal", description: "Complete 5 quests with a party", icon: "confetti", xpReward: 1000, category: "social", tier: 3, criteria: { type: "party_quests_completed", count: 5 } },
];

export async function checkAchievements(userId: string): Promise<AchievementDef[]> {
  // Get user profile and travel app profile
  const [profile, appProfile] = await Promise.all([
    prisma.profiles.findUnique({
      where: { id: userId },
      select: {
        current_streak: true,
        main_level: true,
      },
    }),
    prisma.app_profiles.findUnique({
      where: {
        user_id_app_id: {
          user_id: userId,
          app_id: 'travel',
        },
      },
      select: { level: true },
    }),
  ]);

  if (!profile) return [];

  // Get user's completed achievements
  const userAchievements = await prisma.user_achievements.findMany({
    where: { user_id: userId },
    include: { achievements: true },
  });

  const unlockedCodes = new Set(
    userAchievements
      .filter(ua => ua.is_completed)
      .map(ua => ua.achievements.code)
  );

  // Get travel stats
  const [citiesCount, locationsCount] = await Promise.all([
    prisma.travel_cities.count({ where: { user_id: userId } }),
    prisma.travel_locations.count({ where: { user_id: userId } }),
  ]);

  // Get unique countries
  const cities = await prisma.travel_cities.findMany({
    where: { user_id: userId },
    select: { country: true },
  });
  const countriesCount = new Set(cities.map(c => c.country)).size;

  // Get location type counts
  const locationTypes = await prisma.travel_locations.groupBy({
    by: ['type'],
    where: { user_id: userId },
    _count: { type: true },
  });

  const locationTypeCounts: Record<string, number> = {};
  for (const lt of locationTypes) {
    locationTypeCounts[lt.type] = lt._count.type;
  }

  // Get social stats
  const [friendsCount, partiesCreated, partiesJoined, partyQuestsCompleted] = await Promise.all([
    // Count accepted friendships (user can be requester or addressee)
    prisma.friendships.count({
      where: {
        OR: [{ requester_id: userId }, { addressee_id: userId }],
        status: "ACCEPTED",
      },
    }),
    // Count parties where user is owner
    prisma.quest_party_members.count({
      where: { user_id: userId, role: "OWNER" },
    }),
    // Count all parties user has joined (accepted status)
    prisma.quest_party_members.count({
      where: { user_id: userId, status: "ACCEPTED" },
    }),
    // Count completed quests that had parties
    prisma.travel_quests.count({
      where: {
        status: "COMPLETED",
        party: {
          members: {
            some: { user_id: userId, status: "ACCEPTED" },
          },
        },
      },
    }),
  ]);

  // Build stats object
  const stats = {
    locationsCount,
    citiesCount,
    countriesCount,
    currentStreak: profile.current_streak || 0,
    level: appProfile?.level || profile.main_level || 1,
    locationTypeCounts,
    friendsCount,
    partiesCreated,
    partiesJoined,
    partyQuestsCompleted,
  };

  const newAchievements: AchievementDef[] = [];

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
      case "friends_count":
        unlocked = stats.friendsCount >= (count || 0);
        break;
      case "parties_created":
        unlocked = stats.partiesCreated >= (count || 0);
        break;
      case "parties_joined":
        unlocked = stats.partiesJoined >= (count || 0);
        break;
      case "party_quests_completed":
        unlocked = stats.partyQuestsCompleted >= (count || 0);
        break;
    }

    if (unlocked) {
      // Find or create achievement in DB
      let dbAchievement = await prisma.achievements.findUnique({
        where: { code: achievement.code },
      });

      if (!dbAchievement) {
        dbAchievement = await prisma.achievements.create({
          data: {
            code: achievement.code,
            app_id: 'travel',
            name: achievement.name,
            description: achievement.description,
            icon: achievement.icon,
            xp_reward: achievement.xpReward,
            category: achievement.category,
            tier: achievement.tier,
            criteria: achievement.criteria,
          },
        });
      }

      // Create user achievement record
      await prisma.user_achievements.upsert({
        where: {
          user_id_achievement_id: {
            user_id: userId,
            achievement_id: dbAchievement.id,
          },
        },
        update: {
          is_completed: true,
          completed_at: new Date(),
        },
        create: {
          user_id: userId,
          achievement_id: dbAchievement.id,
          is_completed: true,
          completed_at: new Date(),
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
    await prisma.achievements.upsert({
      where: { code: achievement.code },
      update: {
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        xp_reward: achievement.xpReward,
        category: achievement.category,
        tier: achievement.tier,
        criteria: achievement.criteria,
      },
      create: {
        code: achievement.code,
        app_id: 'travel',
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        xp_reward: achievement.xpReward,
        category: achievement.category,
        tier: achievement.tier,
        criteria: achievement.criteria,
      },
    });
  }
}
