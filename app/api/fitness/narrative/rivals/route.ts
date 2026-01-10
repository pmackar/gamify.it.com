/**
 * Narrative Engine - Rivals API
 *
 * GET: List user's active rivals (AI + friends) + suggested friends + pending requests
 * POST: Create AI phantom rival OR send friend rivalry request
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { withAuth, validateBody, Errors, SelectFields } from "@/lib/api";
import prisma from "@/lib/db";
import {
  createDefaultPhantomConfig,
  getSuggestedPhantomDifficulty,
} from "@/lib/fitness/narrative/phantom-generator";
import { assignCharacterToPhantom } from "@/lib/fitness/narrative/characters";

// Schema for creating a new rival
const createRivalSchema = z.object({
  rivalType: z.enum(["AI_PHANTOM", "FRIEND"]),
  friendId: z.string().uuid().optional(),
  phantomConfig: z
    .object({
      personality: z.enum(["mirror", "rival", "mentor", "nemesis"]).optional(),
      victoryCondition: z.enum(["rolling_average", "volume_growth", "consistency", "prs", "best_of_3"]).optional(),
      name: z.string().optional(),
      archetype: z.string().optional(),
    })
    .optional(),
  message: z.string().max(200).optional(), // Challenge message for friend requests
});

// GET /api/fitness/narrative/rivals - List user's rivals + suggested friends + pending requests
export const GET = withAuth(async (_request, user) => {
  // Get user's AI phantom rivals
  const aiRivals = await prisma.fitness_rivals.findMany({
    where: { user_id: user.id, rival_type: "AI_PHANTOM" },
    orderBy: { created_at: "desc" },
  });

  // Transform AI rivals to client format
  const transformedAiRivals = aiRivals.map((rival) => ({
    id: rival.id,
    rivalType: "ai_phantom" as const,
    friendId: null,
    phantomConfig: rival.phantom_config,
    respectLevel: rival.respect_level,
    rivalryHeat: rival.rivalry_heat,
    encounterCount: rival.encounter_count,
    winStreak: rival.win_streak,
    longestWinStreak: rival.longest_win_streak,
    longestLoseStreak: rival.longest_lose_streak,
    lastEncounterDate: rival.last_encounter?.toISOString() || null,
    createdAt: rival.created_at.toISOString(),
    headToHead: {
      userWins: rival.user_wins,
      rivalWins: rival.rival_wins,
      ties: rival.ties,
    },
  }));

  // Get user's friend rivalries (shared records)
  const friendRivalries = await prisma.fitness_friend_rivalries.findMany({
    where: {
      is_active: true,
      OR: [{ user1_id: user.id }, { user2_id: user.id }],
    },
    include: {
      user1: { select: SelectFields.userWithLevel },
      user2: { select: SelectFields.userWithLevel },
    },
    orderBy: { created_at: "desc" },
  });

  // Transform friend rivalries - show from current user's perspective
  const transformedFriendRivals = friendRivalries.map((rivalry) => {
    const isUser1 = rivalry.user1_id === user.id;
    const friend = isUser1 ? rivalry.user2 : rivalry.user1;
    const myWins = isUser1 ? rivalry.user1_wins : rivalry.user2_wins;
    const theirWins = isUser1 ? rivalry.user2_wins : rivalry.user1_wins;

    return {
      id: rivalry.id,
      rivalType: "friend" as const,
      friendId: friend.id,
      friend: {
        id: friend.id,
        username: friend.username,
        displayName: friend.display_name,
        avatarUrl: friend.avatar_url,
        level: friend.main_level || 1,
      },
      victoryCondition: rivalry.victory_condition,
      streakHolderId: rivalry.streak_holder_id,
      streakCount: rivalry.streak_count,
      lastShowdown: rivalry.last_showdown?.toISOString() || null,
      createdAt: rivalry.created_at.toISOString(),
      headToHead: {
        userWins: myWins,
        rivalWins: theirWins,
        ties: rivalry.ties,
      },
    };
  });

  // Combine all rivals
  const allRivals = [...transformedAiRivals, ...transformedFriendRivals];

  // Get pending rivalry requests (sent and received)
  const pendingRequests = await prisma.fitness_rivalry_requests.findMany({
    where: {
      status: "PENDING",
      OR: [{ requester_id: user.id }, { addressee_id: user.id }],
    },
    include: {
      requester: { select: SelectFields.userWithLevel },
      addressee: { select: SelectFields.userWithLevel },
    },
    orderBy: { created_at: "desc" },
  });

  const sentRequests = pendingRequests
    .filter((r) => r.requester_id === user.id)
    .map((r) => ({
      id: r.id,
      friendId: r.addressee_id,
      friend: {
        id: r.addressee.id,
        username: r.addressee.username,
        displayName: r.addressee.display_name,
        avatarUrl: r.addressee.avatar_url,
        level: r.addressee.main_level || 1,
      },
      victoryCondition: r.victory_condition,
      message: r.message,
      createdAt: r.created_at.toISOString(),
    }));

  const receivedRequests = pendingRequests
    .filter((r) => r.addressee_id === user.id)
    .map((r) => ({
      id: r.id,
      friendId: r.requester_id,
      friend: {
        id: r.requester.id,
        username: r.requester.username,
        displayName: r.requester.display_name,
        avatarUrl: r.requester.avatar_url,
        level: r.requester.main_level || 1,
      },
      victoryCondition: r.victory_condition,
      message: r.message,
      createdAt: r.created_at.toISOString(),
    }));

  // Get potential friend rivals (friends not already rivals or pending)
  const existingFriendRivalIds = new Set([
    ...friendRivalries.map((r) => r.user1_id === user.id ? r.user2_id : r.user1_id),
    ...pendingRequests.map((r) => r.requester_id === user.id ? r.addressee_id : r.requester_id),
  ]);

  const friendships = await prisma.friendships.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requester_id: user.id }, { addressee_id: user.id }],
    },
    select: {
      requester_id: true,
      addressee_id: true,
    },
  });

  const friendIds = friendships
    .map((f) => (f.requester_id === user.id ? f.addressee_id : f.requester_id))
    .filter((id) => !existingFriendRivalIds.has(id));

  // Get friend profiles
  let suggestedFriends: Array<{
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    level: number;
  }> = [];

  if (friendIds.length > 0) {
    const friendProfiles = await prisma.profiles.findMany({
      where: { id: { in: friendIds } },
      select: SelectFields.userWithLevel,
    });

    suggestedFriends = friendProfiles.map((p) => ({
      id: p.id,
      username: p.username,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
      level: p.main_level || 1,
    }));
  }

  return NextResponse.json({
    rivals: allRivals,
    suggestedFriends,
    pendingRequests: {
      sent: sentRequests,
      received: receivedRequests,
    },
  });
});

// POST /api/fitness/narrative/rivals - Create AI phantom OR send friend rivalry request
export const POST = withAuth(async (request, user) => {
  const body = await validateBody(request, createRivalSchema);
  if (body instanceof NextResponse) return body;

  // Get user's current level for difficulty suggestion
  const userProfile = await prisma.profiles.findUnique({
    where: { id: user.id },
    select: { main_level: true, display_name: true, username: true },
  });
  const userLevel = userProfile?.main_level || 1;

  // Handle FRIEND rivalry - send a request instead of creating instantly
  if (body.rivalType === "FRIEND") {
    if (!body.friendId) {
      return Errors.invalidInput("Friend ID required for friend rivals");
    }

    // Verify friendship exists
    const friendship = await prisma.friendships.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { requester_id: user.id, addressee_id: body.friendId },
          { requester_id: body.friendId, addressee_id: user.id },
        ],
      },
    });

    if (!friendship) {
      return Errors.invalidInput("Must be friends to create a rivalry");
    }

    // Check if rivalry already exists (in either direction)
    const existingRivalry = await prisma.fitness_friend_rivalries.findFirst({
      where: {
        OR: [
          { user1_id: user.id, user2_id: body.friendId },
          { user1_id: body.friendId, user2_id: user.id },
        ],
      },
    });

    if (existingRivalry) {
      return Errors.conflict("Rivalry with this friend already exists");
    }

    // Check for pending request (in either direction)
    const existingRequest = await prisma.fitness_rivalry_requests.findFirst({
      where: {
        status: "PENDING",
        OR: [
          { requester_id: user.id, addressee_id: body.friendId },
          { requester_id: body.friendId, addressee_id: user.id },
        ],
      },
    });

    if (existingRequest) {
      return Errors.conflict("A rivalry request is already pending");
    }

    // Victory condition defaults to "best_of_3" for friend rivalries
    const victoryCondition = body.phantomConfig?.victoryCondition || "best_of_3";

    // Create the rivalry request
    const rivalryRequest = await prisma.fitness_rivalry_requests.create({
      data: {
        requester_id: user.id,
        addressee_id: body.friendId,
        victory_condition: victoryCondition,
        message: body.message || null,
        status: "PENDING",
      },
      include: {
        addressee: { select: SelectFields.userWithLevel },
      },
    });

    return NextResponse.json({
      type: "request_sent",
      request: {
        id: rivalryRequest.id,
        friendId: rivalryRequest.addressee_id,
        friend: {
          id: rivalryRequest.addressee.id,
          username: rivalryRequest.addressee.username,
          displayName: rivalryRequest.addressee.display_name,
          avatarUrl: rivalryRequest.addressee.avatar_url,
          level: rivalryRequest.addressee.main_level || 1,
        },
        victoryCondition: rivalryRequest.victory_condition,
        message: rivalryRequest.message,
        createdAt: rivalryRequest.created_at.toISOString(),
      },
    });
  }

  // Handle AI_PHANTOM rivalry - create instantly
  // Check rival limit (AI phantoms only)
  const aiRivalCount = await prisma.fitness_rivals.count({
    where: { user_id: user.id, rival_type: "AI_PHANTOM" },
  });

  const settings = await prisma.fitness_narrative_settings.findUnique({
    where: { user_id: user.id },
  });
  const maxRivals = settings?.max_active_rivals || 3;

  if (aiRivalCount >= maxRivals) {
    return Errors.invalidInput(`Maximum ${maxRivals} AI rivals allowed`);
  }

  const difficulty = getSuggestedPhantomDifficulty(userLevel);
  const defaultConfig = createDefaultPhantomConfig(difficulty.personality);

  const personality =
    body.phantomConfig?.personality || defaultConfig.personality;

  // Use provided archetype to find character, or assign one based on personality
  let character;
  if (body.phantomConfig?.archetype) {
    const { getCharacterById } = await import(
      "@/lib/fitness/narrative/characters"
    );
    character = getCharacterById(body.phantomConfig.archetype);
  }

  // Fall back to auto-assignment if no character found
  if (!character) {
    character = assignCharacterToPhantom(
      personality,
      `${user.id}-${Date.now()}`
    );
  }

  const phantomConfig = {
    personality,
    rubberBandStrength: difficulty.rubberBandStrength,
    volatility: difficulty.volatility,
    name: body.phantomConfig?.name || character.name,
    archetype: character.id,
    characterId: character.id,
    avatar: character.avatar,
    color: character.color,
    tagline: character.tagline,
  };

  // Create the AI phantom rival
  const rival = await prisma.fitness_rivals.create({
    data: {
      user_id: user.id,
      rival_type: "AI_PHANTOM",
      friend_id: null,
      phantom_config: phantomConfig as Prisma.InputJsonValue,
      respect_level: 1,
      rivalry_heat: 50,
      encounter_count: 0,
      win_streak: 0,
      longest_win_streak: 0,
      longest_lose_streak: 0,
      user_wins: 0,
      rival_wins: 0,
      ties: 0,
    },
  });

  return NextResponse.json({
    type: "rival_created",
    rival: {
      id: rival.id,
      rivalType: "ai_phantom",
      friendId: null,
      phantomConfig: rival.phantom_config,
      respectLevel: rival.respect_level,
      rivalryHeat: rival.rivalry_heat,
      encounterCount: rival.encounter_count,
      winStreak: rival.win_streak,
      longestWinStreak: rival.longest_win_streak,
      longestLoseStreak: rival.longest_lose_streak,
      lastEncounterDate: null,
      createdAt: rival.created_at.toISOString(),
      headToHead: {
        userWins: 0,
        rivalWins: 0,
        ties: 0,
      },
    },
  });
});
