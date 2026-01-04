/**
 * Response Transformers
 *
 * Pure functions to convert database models to consistent API response formats.
 * No database access - purely transformation logic.
 */

import type { Decimal } from "@prisma/client/runtime/library";

// ============================================================================
// Type Definitions
// ============================================================================

export interface LocationResponse {
  id: string;
  name: string;
  type: string;
  address: string | null;
  latitude: number;
  longitude: number;
  cityId: string;
  neighborhoodId: string | null;
  googlePlaceId: string | null;
  notes: string | null;
  createdAt: string;
  city?: {
    id: string;
    name: string;
    country: string;
  };
  neighborhood?: {
    id: string;
    name: string;
  } | null;
  userData?: LocationUserData;
}

export interface LocationUserData {
  isVisited: boolean;
  isHotlisted: boolean;
  rating: number | null;
  visitCount: number;
  firstVisited: string | null;
  lastVisited: string | null;
}

export interface QuestResponse {
  id: string;
  name: string;
  description: string | null;
  status: string;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
  isOwner: boolean;
  creatorId: string;
  creator?: UserPublicResponse;
  items?: QuestItemResponse[];
  itemCount?: number;
  completedCount?: number;
  completionPercentage?: number;
  party?: PartyResponse | null;
}

export interface QuestItemResponse {
  id: string;
  locationId: string;
  sortOrder: number;
  isCompleted: boolean;
  completedAt: string | null;
  addedById: string | null;
  completedById: string | null;
  location?: LocationResponse;
}

export interface PartyResponse {
  id: string;
  questId: string;
  createdAt: string;
  members: PartyMemberResponse[];
  memberCount: number;
}

export interface PartyMemberResponse {
  id: string;
  userId: string;
  role: string;
  status: string;
  joinedAt: string | null;
  user: UserPublicResponse;
}

export interface UserPublicResponse {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface XPAwardResponse {
  success: boolean;
  xpAwarded: number;
  boostApplied: boolean;
  boostMultiplier: number;
  newTotalXP: number;
  newLevel: number;
  leveledUp: boolean;
  xpToNext: number;
}

export interface AchievementResponse {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  tier: number;
  xpReward: number;
  unlockedAt: string;
}

// ============================================================================
// Database Record Types (simplified for transformer input)
// ============================================================================

interface DbLocation {
  id: string;
  name: string;
  type: string;
  address?: string | null;
  latitude: Decimal | number;
  longitude: Decimal | number;
  city_id: string;
  neighborhood_id?: string | null;
  google_place_id?: string | null;
  notes?: string | null;
  created_at: Date;
  city?: { id: string; name: string; country: string };
  neighborhood?: { id: string; name: string } | null;
}

interface DbUserLocationData {
  is_visited?: boolean;
  is_hotlisted?: boolean;
  personal_rating?: number | null;
  visit_count?: number;
  first_visited?: Date | null;
  last_visited?: Date | null;
}

interface DbQuest {
  id: string;
  name: string;
  description: string | null;
  status: string;
  target_date: Date | null;
  created_at: Date;
  updated_at: Date;
  creator_id: string;
  creator?: DbUser;
  quest_items?: DbQuestItem[];
  quest_parties?: DbParty[];
}

interface DbQuestItem {
  id: string;
  location_id: string;
  sort_order: number;
  is_completed: boolean;
  completed_at: Date | null;
  added_by_id: string | null;
  completed_by_id: string | null;
  location?: DbLocation;
}

interface DbParty {
  id: string;
  quest_id: string;
  created_at: Date;
  quest_party_members?: DbPartyMember[];
}

interface DbPartyMember {
  id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: Date | null;
  user?: DbUser;
}

interface DbUser {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface DbAchievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  tier: number;
  xp_reward: number;
}

// ============================================================================
// Transformer Functions
// ============================================================================

/**
 * Transform database location to API response
 */
export function toLocationResponse(
  location: DbLocation,
  userData?: DbUserLocationData
): LocationResponse {
  return {
    id: location.id,
    name: location.name,
    type: location.type,
    address: location.address ?? null,
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
    cityId: location.city_id,
    neighborhoodId: location.neighborhood_id ?? null,
    googlePlaceId: location.google_place_id ?? null,
    notes: location.notes ?? null,
    createdAt: location.created_at.toISOString(),
    city: location.city
      ? {
          id: location.city.id,
          name: location.city.name,
          country: location.city.country,
        }
      : undefined,
    neighborhood: location.neighborhood
      ? {
          id: location.neighborhood.id,
          name: location.neighborhood.name,
        }
      : null,
    userData: userData ? toLocationUserData(userData) : undefined,
  };
}

/**
 * Transform user location data
 */
export function toLocationUserData(data: DbUserLocationData): LocationUserData {
  return {
    isVisited: data.is_visited ?? false,
    isHotlisted: data.is_hotlisted ?? false,
    rating: data.personal_rating ?? null,
    visitCount: data.visit_count ?? 0,
    firstVisited: data.first_visited?.toISOString() ?? null,
    lastVisited: data.last_visited?.toISOString() ?? null,
  };
}

/**
 * Transform database user to public response
 */
export function toUserPublicResponse(user: DbUser): UserPublicResponse {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
  };
}

/**
 * Transform database quest to API response
 */
export function toQuestResponse(
  quest: DbQuest,
  currentUserId: string,
  options: { includeItems?: boolean; includeParty?: boolean } = {}
): QuestResponse {
  const { includeItems = true, includeParty = true } = options;

  const items = quest.quest_items ?? [];
  const completedCount = items.filter((i) => i.is_completed).length;
  const itemCount = items.length;

  const response: QuestResponse = {
    id: quest.id,
    name: quest.name,
    description: quest.description,
    status: quest.status,
    targetDate: quest.target_date?.toISOString() ?? null,
    createdAt: quest.created_at.toISOString(),
    updatedAt: quest.updated_at.toISOString(),
    isOwner: quest.creator_id === currentUserId,
    creatorId: quest.creator_id,
    creator: quest.creator ? toUserPublicResponse(quest.creator) : undefined,
    itemCount,
    completedCount,
    completionPercentage: itemCount > 0 ? Math.round((completedCount / itemCount) * 100) : 0,
  };

  if (includeItems && quest.quest_items) {
    response.items = quest.quest_items.map(toQuestItemResponse);
  }

  if (includeParty && quest.quest_parties?.[0]) {
    response.party = toPartyResponse(quest.quest_parties[0]);
  }

  return response;
}

/**
 * Transform database quest item to API response
 */
export function toQuestItemResponse(item: DbQuestItem): QuestItemResponse {
  return {
    id: item.id,
    locationId: item.location_id,
    sortOrder: item.sort_order,
    isCompleted: item.is_completed,
    completedAt: item.completed_at?.toISOString() ?? null,
    addedById: item.added_by_id,
    completedById: item.completed_by_id,
    location: item.location ? toLocationResponse(item.location) : undefined,
  };
}

/**
 * Transform database party to API response
 */
export function toPartyResponse(party: DbParty): PartyResponse {
  const members = party.quest_party_members ?? [];
  return {
    id: party.id,
    questId: party.quest_id,
    createdAt: party.created_at.toISOString(),
    members: members.map(toPartyMemberResponse),
    memberCount: members.filter((m) => m.status === "JOINED").length,
  };
}

/**
 * Transform database party member to API response
 */
export function toPartyMemberResponse(member: DbPartyMember): PartyMemberResponse {
  return {
    id: member.id,
    userId: member.user_id,
    role: member.role,
    status: member.status,
    joinedAt: member.joined_at?.toISOString() ?? null,
    user: member.user
      ? toUserPublicResponse(member.user)
      : { id: member.user_id, username: null, displayName: null, avatarUrl: null },
  };
}

/**
 * Transform XP award result to API response
 */
export function toXPAwardResponse(result: {
  xpAwarded: number;
  boostApplied: boolean;
  boostMultiplier: number;
  newTotalXP: number;
  newLevel: number;
  leveledUp: boolean;
  xpToNext: number;
}): XPAwardResponse {
  return {
    success: true,
    ...result,
  };
}

/**
 * Transform achievement to API response
 */
export function toAchievementResponse(
  achievement: DbAchievement,
  unlockedAt: Date
): AchievementResponse {
  return {
    id: achievement.id,
    code: achievement.code,
    name: achievement.name,
    description: achievement.description,
    icon: achievement.icon,
    category: achievement.category,
    tier: achievement.tier,
    xpReward: achievement.xp_reward,
    unlockedAt: unlockedAt.toISOString(),
  };
}

// ============================================================================
// Batch Transformers
// ============================================================================

/**
 * Transform array of locations
 */
export function toLocationResponses(
  locations: DbLocation[],
  userDataMap?: Map<string, DbUserLocationData>
): LocationResponse[] {
  return locations.map((loc) =>
    toLocationResponse(loc, userDataMap?.get(loc.id))
  );
}

/**
 * Transform array of quests
 */
export function toQuestResponses(
  quests: DbQuest[],
  currentUserId: string,
  options?: { includeItems?: boolean; includeParty?: boolean }
): QuestResponse[] {
  return quests.map((quest) => toQuestResponse(quest, currentUserId, options));
}
