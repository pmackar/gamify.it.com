import prisma from '@/lib/db';

export type LeagueTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'OBSIDIAN' | 'LEGENDARY';

export const LEAGUE_TIERS: { tier: LeagueTier; name: string; color: string; icon: string; minRank: number }[] = [
  { tier: 'BRONZE', name: 'Bronze', color: '#CD7F32', icon: '🥉', minRank: 1 },
  { tier: 'SILVER', name: 'Silver', color: '#C0C0C0', icon: '🥈', minRank: 2 },
  { tier: 'GOLD', name: 'Gold', color: '#FFD700', icon: '🥇', minRank: 3 },
  { tier: 'PLATINUM', name: 'Platinum', color: '#E5E4E2', icon: '💎', minRank: 4 },
  { tier: 'DIAMOND', name: 'Diamond', color: '#B9F2FF', icon: '💠', minRank: 5 },
  { tier: 'OBSIDIAN', name: 'Obsidian', color: '#3D3D3D', icon: '🖤', minRank: 6 },
  { tier: 'LEGENDARY', name: 'Legendary', color: '#FF6B6B', icon: '👑', minRank: 7 },
];

export const LEAGUE_CONFIG = {
  MAX_MEMBERS_PER_LEAGUE: 30,
  PROMOTION_THRESHOLD: 10,    // Top 10 get promoted
  DEMOTION_THRESHOLD: 5,      // Bottom 5 get demoted
  WEEK_RESET_DAY: 0,          // Sunday
  WEEK_RESET_HOUR: 23,        // 11:59 PM
  WEEK_RESET_MINUTE: 59,
};

export function getTierInfo(tier: LeagueTier) {
  return LEAGUE_TIERS.find(t => t.tier === tier) || LEAGUE_TIERS[0];
}

export function getNextTier(tier: LeagueTier): LeagueTier | null {
  const index = LEAGUE_TIERS.findIndex(t => t.tier === tier);
  if (index < LEAGUE_TIERS.length - 1) {
    return LEAGUE_TIERS[index + 1].tier;
  }
  return null;
}

export function getPreviousTier(tier: LeagueTier): LeagueTier | null {
  const index = LEAGUE_TIERS.findIndex(t => t.tier === tier);
  if (index > 0) {
    return LEAGUE_TIERS[index - 1].tier;
  }
  return null;
}

export function getWeekBounds(date: Date = new Date()): { weekStart: Date; weekEnd: Date } {
  const d = new Date(date);
  const day = d.getDay();

  // Get Monday of current week
  const weekStart = new Date(d);
  weekStart.setDate(d.getDate() - ((day + 6) % 7)); // Monday
  weekStart.setHours(0, 0, 0, 0);

  // Get Sunday of current week
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

export function getTimeUntilWeekReset(): { hours: number; minutes: number; seconds: number } {
  const { weekEnd } = getWeekBounds();
  const now = new Date();
  const diff = weekEnd.getTime() - now.getTime();

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { hours: Math.max(0, hours), minutes: Math.max(0, minutes), seconds: Math.max(0, seconds) };
}

/**
 * Get or create league stats for a user
 */
export async function getOrCreateLeagueStats(userId: string) {
  let stats = await prisma.league_stats.findUnique({
    where: { user_id: userId },
  });

  if (!stats) {
    stats = await prisma.league_stats.create({
      data: {
        user_id: userId,
        current_tier: 'BRONZE',
        highest_tier: 'BRONZE',
      },
    });
  }

  return stats;
}

/**
 * Find or create a league for the current week at a given tier
 */
export async function findOrCreateLeague(tier: LeagueTier): Promise<string> {
  const { weekStart, weekEnd } = getWeekBounds();

  // Find a league with available spots
  const existingLeague = await prisma.leagues.findFirst({
    where: {
      tier,
      week_start: weekStart,
      week_end: weekEnd,
    },
    include: {
      _count: {
        select: { members: true },
      },
    },
    orderBy: {
      created_at: 'asc',
    },
  });

  if (existingLeague && existingLeague._count.members < LEAGUE_CONFIG.MAX_MEMBERS_PER_LEAGUE) {
    return existingLeague.id;
  }

  // Create a new league
  const newLeague = await prisma.leagues.create({
    data: {
      tier,
      week_start: weekStart,
      week_end: weekEnd,
    },
  });

  return newLeague.id;
}

/**
 * Join user to their appropriate league for the current week
 */
export async function joinLeague(userId: string): Promise<{
  leagueId: string;
  tier: LeagueTier;
  isNew: boolean;
}> {
  const { weekStart, weekEnd } = getWeekBounds();

  // Check if user is already in a league this week
  const existingMembership = await prisma.league_members.findFirst({
    where: {
      user_id: userId,
      league: {
        week_start: weekStart,
        week_end: weekEnd,
      },
    },
    include: {
      league: true,
    },
  });

  if (existingMembership) {
    return {
      leagueId: existingMembership.league_id,
      tier: existingMembership.league.tier as LeagueTier,
      isNew: false,
    };
  }

  // Get user's tier from stats
  const stats = await getOrCreateLeagueStats(userId);
  const tier = stats.current_tier as LeagueTier;

  // Find or create a league
  const leagueId = await findOrCreateLeague(tier);

  // Add user to league
  await prisma.league_members.create({
    data: {
      league_id: leagueId,
      user_id: userId,
      weekly_xp: 0,
    },
  });

  return {
    leagueId,
    tier,
    isNew: true,
  };
}

/**
 * Add XP to user's weekly league total
 */
export async function addWeeklyXp(userId: string, xpAmount: number): Promise<void> {
  const { weekStart, weekEnd } = getWeekBounds();

  // Find user's current league membership
  const membership = await prisma.league_members.findFirst({
    where: {
      user_id: userId,
      league: {
        week_start: weekStart,
        week_end: weekEnd,
      },
    },
  });

  if (membership) {
    await prisma.league_members.update({
      where: { id: membership.id },
      data: {
        weekly_xp: { increment: xpAmount },
      },
    });
  }
}

/**
 * Get league standings with ranks
 */
export async function getLeagueStandings(leagueId: string): Promise<{
  members: Array<{
    userId: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    weeklyXp: number;
    rank: number;
    zone: 'promotion' | 'safe' | 'demotion';
  }>;
  league: {
    id: string;
    tier: LeagueTier;
    memberCount: number;
  };
}> {
  const league = await prisma.leagues.findUnique({
    where: { id: leagueId },
    include: {
      members: {
        orderBy: { weekly_xp: 'desc' },
      },
    },
  });

  if (!league) {
    throw new Error('League not found');
  }

  // Get profile info for all members
  const userIds = league.members.map(m => m.user_id);
  const profiles = await prisma.profiles.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      username: true,
      display_name: true,
      avatar_url: true,
    },
  });

  const profileMap = new Map(profiles.map(p => [p.id, p]));
  const memberCount = league.members.length;

  const members = league.members.map((member, index) => {
    const rank = index + 1;
    const profile = profileMap.get(member.user_id);

    let zone: 'promotion' | 'safe' | 'demotion' = 'safe';
    if (rank <= LEAGUE_CONFIG.PROMOTION_THRESHOLD && league.tier !== 'LEGENDARY') {
      zone = 'promotion';
    } else if (rank > memberCount - LEAGUE_CONFIG.DEMOTION_THRESHOLD && league.tier !== 'BRONZE') {
      zone = 'demotion';
    }

    return {
      userId: member.user_id,
      username: profile?.username || null,
      displayName: profile?.display_name || null,
      avatarUrl: profile?.avatar_url || null,
      weeklyXp: member.weekly_xp,
      rank,
      zone,
    };
  });

  return {
    members,
    league: {
      id: league.id,
      tier: league.tier as LeagueTier,
      memberCount,
    },
  };
}

/**
 * Get user's league status for the current week
 */
export async function getUserLeagueStatus(userId: string): Promise<{
  inLeague: boolean;
  league?: {
    id: string;
    tier: LeagueTier;
    tierInfo: typeof LEAGUE_TIERS[0];
  };
  userStats: {
    weeklyXp: number;
    rank: number | null;
    zone: 'promotion' | 'safe' | 'demotion';
  };
  overallStats: {
    currentTier: LeagueTier;
    highestTier: LeagueTier;
    weeksParticipated: number;
    totalPromotions: number;
    top3Finishes: number;
    firstPlaceWins: number;
  };
  timeRemaining: { hours: number; minutes: number; seconds: number };
} | null> {
  const { weekStart, weekEnd } = getWeekBounds();

  // Find user's current league membership
  const membership = await prisma.league_members.findFirst({
    where: {
      user_id: userId,
      league: {
        week_start: weekStart,
        week_end: weekEnd,
      },
    },
    include: {
      league: {
        include: {
          members: {
            orderBy: { weekly_xp: 'desc' },
          },
        },
      },
    },
  });

  const stats = await getOrCreateLeagueStats(userId);
  const timeRemaining = getTimeUntilWeekReset();

  if (!membership) {
    return {
      inLeague: false,
      userStats: {
        weeklyXp: 0,
        rank: null,
        zone: 'safe',
      },
      overallStats: {
        currentTier: stats.current_tier as LeagueTier,
        highestTier: stats.highest_tier as LeagueTier,
        weeksParticipated: stats.weeks_participated,
        totalPromotions: stats.total_promotions,
        top3Finishes: stats.top_3_finishes,
        firstPlaceWins: stats.first_place_wins,
      },
      timeRemaining,
    };
  }

  // Calculate rank
  const rank = membership.league.members.findIndex(m => m.user_id === userId) + 1;
  const memberCount = membership.league.members.length;

  let zone: 'promotion' | 'safe' | 'demotion' = 'safe';
  if (rank <= LEAGUE_CONFIG.PROMOTION_THRESHOLD && membership.league.tier !== 'LEGENDARY') {
    zone = 'promotion';
  } else if (rank > memberCount - LEAGUE_CONFIG.DEMOTION_THRESHOLD && membership.league.tier !== 'BRONZE') {
    zone = 'demotion';
  }

  return {
    inLeague: true,
    league: {
      id: membership.league.id,
      tier: membership.league.tier as LeagueTier,
      tierInfo: getTierInfo(membership.league.tier as LeagueTier),
    },
    userStats: {
      weeklyXp: membership.weekly_xp,
      rank,
      zone,
    },
    overallStats: {
      currentTier: stats.current_tier as LeagueTier,
      highestTier: stats.highest_tier as LeagueTier,
      weeksParticipated: stats.weeks_participated,
      totalPromotions: stats.total_promotions,
      top3Finishes: stats.top_3_finishes,
      firstPlaceWins: stats.first_place_wins,
    },
    timeRemaining,
  };
}
