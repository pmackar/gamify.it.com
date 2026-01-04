import prisma from '@/lib/db';

export interface SeasonReward {
  type: 'xp' | 'item' | 'cosmetic' | 'currency' | 'title';
  code?: string;
  amount?: number;
  name?: string;
  description?: string;
}

export interface SeasonTierReward {
  tierNumber: number;
  freeReward: SeasonReward;
  premiumReward?: SeasonReward;
  isMilestone: boolean;
}

/**
 * Get the currently active season
 */
export async function getActiveSeason() {
  const now = new Date();

  const season = await prisma.seasons.findFirst({
    where: {
      status: 'ACTIVE',
      starts_at: { lte: now },
      ends_at: { gte: now },
    },
    include: {
      tiers: {
        orderBy: { tier_number: 'asc' },
      },
    },
  });

  return season;
}

/**
 * Get user's progress in the current season
 */
export async function getUserSeasonProgress(userId: string) {
  const season = await getActiveSeason();

  if (!season) {
    return null;
  }

  let progress = await prisma.user_season_progress.findUnique({
    where: {
      user_id_season_id: {
        user_id: userId,
        season_id: season.id,
      },
    },
  });

  // Create progress record if it doesn't exist
  if (!progress) {
    progress = await prisma.user_season_progress.create({
      data: {
        user_id: userId,
        season_id: season.id,
        season_xp: 0,
        current_tier: 0,
        has_premium: false,
        claimed_free: [],
        claimed_premium: [],
      },
    });
  }

  // Calculate tier from XP
  const currentTier = Math.floor(progress.season_xp / season.xp_per_tier);
  const xpInTier = progress.season_xp % season.xp_per_tier;
  const xpToNextTier = season.xp_per_tier - xpInTier;

  // Calculate time remaining
  const now = new Date();
  const endDate = new Date(season.ends_at);
  const timeRemaining = endDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60 * 24)));
  const hoursRemaining = Math.max(0, Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));

  return {
    season: {
      id: season.id,
      name: season.name,
      theme: season.theme,
      description: season.description,
      icon: season.icon,
      tierCount: season.tier_count,
      xpPerTier: season.xp_per_tier,
      startsAt: season.starts_at,
      endsAt: season.ends_at,
    },
    progress: {
      seasonXp: progress.season_xp,
      currentTier: Math.min(currentTier, season.tier_count),
      xpInTier,
      xpToNextTier,
      hasPremium: progress.has_premium,
      claimedFree: progress.claimed_free,
      claimedPremium: progress.claimed_premium,
    },
    tiers: season.tiers.map(t => ({
      tierNumber: t.tier_number,
      freeReward: t.free_reward as SeasonReward,
      premiumReward: t.premium_reward as SeasonReward | null,
      isMilestone: t.is_milestone,
      isUnlocked: currentTier >= t.tier_number,
      isFreeClaimed: progress!.claimed_free.includes(t.tier_number),
      isPremiumClaimed: progress!.claimed_premium.includes(t.tier_number),
    })),
    timeRemaining: {
      days: daysRemaining,
      hours: hoursRemaining,
    },
  };
}

/**
 * Add XP to user's season progress
 */
export async function addSeasonXp(userId: string, xpAmount: number): Promise<void> {
  const season = await getActiveSeason();

  if (!season) {
    return; // No active season
  }

  // Get or create progress
  let progress = await prisma.user_season_progress.findUnique({
    where: {
      user_id_season_id: {
        user_id: userId,
        season_id: season.id,
      },
    },
  });

  if (!progress) {
    progress = await prisma.user_season_progress.create({
      data: {
        user_id: userId,
        season_id: season.id,
        season_xp: 0,
        current_tier: 0,
      },
    });
  }

  // Update XP and tier
  const newSeasonXp = progress.season_xp + xpAmount;
  const newTier = Math.min(Math.floor(newSeasonXp / season.xp_per_tier), season.tier_count);

  await prisma.user_season_progress.update({
    where: { id: progress.id },
    data: {
      season_xp: newSeasonXp,
      current_tier: newTier,
      updated_at: new Date(),
    },
  });
}

/**
 * Claim a tier reward
 */
export async function claimTierReward(
  userId: string,
  tierNumber: number,
  isPremium: boolean
): Promise<{
  success: boolean;
  reward?: SeasonReward;
  error?: string;
}> {
  const season = await getActiveSeason();

  if (!season) {
    return { success: false, error: 'No active season' };
  }

  // Get progress
  const progress = await prisma.user_season_progress.findUnique({
    where: {
      user_id_season_id: {
        user_id: userId,
        season_id: season.id,
      },
    },
  });

  if (!progress) {
    return { success: false, error: 'No progress found' };
  }

  // Check if tier is unlocked
  const currentTier = Math.floor(progress.season_xp / season.xp_per_tier);
  if (tierNumber > currentTier) {
    return { success: false, error: 'Tier not unlocked yet' };
  }

  // Check if premium required
  if (isPremium && !progress.has_premium) {
    return { success: false, error: 'Premium pass required' };
  }

  // Check if already claimed
  const claimedList = isPremium ? progress.claimed_premium : progress.claimed_free;
  if (claimedList.includes(tierNumber)) {
    return { success: false, error: 'Already claimed' };
  }

  // Get the tier reward
  const tier = season.tiers.find(t => t.tier_number === tierNumber);
  if (!tier) {
    return { success: false, error: 'Tier not found' };
  }

  const reward = isPremium
    ? (tier.premium_reward as SeasonReward)
    : (tier.free_reward as SeasonReward);

  if (!reward) {
    return { success: false, error: 'No reward for this tier' };
  }

  // Award the reward
  await awardReward(userId, reward);

  // Mark as claimed
  const updatedClaimed = [...claimedList, tierNumber];

  await prisma.user_season_progress.update({
    where: { id: progress.id },
    data: isPremium
      ? { claimed_premium: updatedClaimed }
      : { claimed_free: updatedClaimed },
  });

  return { success: true, reward };
}

/**
 * Award a reward to user
 */
async function awardReward(userId: string, reward: SeasonReward): Promise<void> {
  switch (reward.type) {
    case 'xp':
      if (reward.amount) {
        await prisma.profiles.update({
          where: { id: userId },
          data: {
            total_xp: { increment: reward.amount },
            updated_at: new Date(),
          },
        });
      }
      break;

    case 'item':
      if (reward.code) {
        // Find the item
        const item = await prisma.inventory_items.findUnique({
          where: { code: reward.code },
        });

        if (item) {
          // Add to inventory
          const existing = await prisma.user_inventory.findFirst({
            where: { user_id: userId, item_id: item.id },
          });

          if (existing && item.stackable) {
            await prisma.user_inventory.update({
              where: { id: existing.id },
              data: { quantity: { increment: 1 } },
            });
          } else {
            await prisma.user_inventory.create({
              data: {
                user_id: userId,
                item_id: item.id,
                quantity: 1,
                source: 'battle_pass',
              },
            });
          }
        }
      }
      break;

    case 'cosmetic':
    case 'title':
      // These would be stored in a user_cosmetics table (future implementation)
      // For now, add to inventory as a cosmetic item
      if (reward.code) {
        const item = await prisma.inventory_items.findUnique({
          where: { code: reward.code },
        });

        if (item) {
          await prisma.user_inventory.create({
            data: {
              user_id: userId,
              item_id: item.id,
              quantity: 1,
              source: 'battle_pass',
            },
          });
        }
      }
      break;
  }
}

/**
 * Purchase premium battle pass
 */
export async function purchasePremiumPass(userId: string): Promise<boolean> {
  const season = await getActiveSeason();

  if (!season) {
    return false;
  }

  await prisma.user_season_progress.upsert({
    where: {
      user_id_season_id: {
        user_id: userId,
        season_id: season.id,
      },
    },
    update: {
      has_premium: true,
      purchased_at: new Date(),
    },
    create: {
      user_id: userId,
      season_id: season.id,
      has_premium: true,
      purchased_at: new Date(),
    },
  });

  return true;
}

/**
 * Generate default tier rewards for a season
 */
export function generateDefaultTierRewards(tierCount: number = 50): SeasonTierReward[] {
  const tiers: SeasonTierReward[] = [];

  for (let i = 1; i <= tierCount; i++) {
    const isMilestone = i % 10 === 0;
    const isMiniMilestone = i % 5 === 0 && !isMilestone;

    let freeReward: SeasonReward;
    let premiumReward: SeasonReward | undefined;

    if (i === tierCount) {
      // Final tier - Legendary rewards
      freeReward = { type: 'item', code: 'legendary_loot_box', name: 'Legendary Loot Box' };
      premiumReward = { type: 'cosmetic', code: 'frame_legendary_hero', name: 'Hero Frame' };
    } else if (isMilestone) {
      // Every 10 tiers - Epic rewards
      freeReward = { type: 'item', code: 'loot_box_epic', name: 'Epic Loot Box' };
      premiumReward = { type: 'cosmetic', code: `frame_tier_${i}`, name: `Tier ${i} Frame` };
    } else if (isMiniMilestone) {
      // Every 5 tiers - Rare rewards
      freeReward = { type: 'item', code: 'streak_shield', name: 'Streak Shield' };
      premiumReward = { type: 'item', code: 'loot_box_rare', name: 'Rare Loot Box' };
    } else {
      // Regular tiers
      freeReward = { type: 'xp', amount: 50 + (i * 5), name: `${50 + (i * 5)} XP` };
      premiumReward = { type: 'xp', amount: 100 + (i * 10), name: `${100 + (i * 10)} XP` };
    }

    tiers.push({
      tierNumber: i,
      freeReward,
      premiumReward,
      isMilestone: isMilestone || isMiniMilestone,
    });
  }

  return tiers;
}
