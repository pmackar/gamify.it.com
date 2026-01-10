/**
 * Narrative Engine - Rivals API
 *
 * GET: List user's active rivals + suggested friends
 * POST: Create new rival (AI phantom or friend)
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
      name: z.string().optional(),
      archetype: z.string().optional(),
    })
    .optional(),
});

// GET /api/fitness/narrative/rivals - List user's rivals + suggested friends
export const GET = withAuth(async (_request, user) => {
  // Get user's active rivals
  const rivals = await prisma.fitness_rivals.findMany({
    where: { user_id: user.id },
    orderBy: { created_at: "desc" },
  });

  // Transform to client format
  const transformedRivals = rivals.map((rival) => ({
    id: rival.id,
    rivalType: rival.rival_type === "AI_PHANTOM" ? "ai_phantom" : "friend",
    friendId: rival.friend_id,
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

  // Get potential friend rivals (friends not already rivals)
  const existingFriendRivalIds = rivals
    .filter((r) => r.rival_type === "FRIEND" && r.friend_id)
    .map((r) => r.friend_id!);

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
    .filter((id) => !existingFriendRivalIds.includes(id));

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
      select: {
        ...SelectFields.userWithLevel,
      },
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
    rivals: transformedRivals,
    suggestedFriends,
  });
});

// POST /api/fitness/narrative/rivals - Create new rival
export const POST = withAuth(async (request, user) => {
  const body = await validateBody(request, createRivalSchema);
  if (body instanceof NextResponse) return body;

  // Get user's current level for difficulty suggestion
  const userProfile = await prisma.profiles.findUnique({
    where: { id: user.id },
    select: { main_level: true },
  });
  const userLevel = userProfile?.main_level || 1;

  // Validate based on rival type
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

    // Check if rivalry already exists
    const existingRival = await prisma.fitness_rivals.findFirst({
      where: {
        user_id: user.id,
        rival_type: "FRIEND",
        friend_id: body.friendId,
      },
    });

    if (existingRival) {
      return Errors.conflict("Rivalry with this friend already exists");
    }
  }

  // Check rival limit
  const rivalCount = await prisma.fitness_rivals.count({
    where: { user_id: user.id },
  });

  const settings = await prisma.fitness_narrative_settings.findUnique({
    where: { user_id: user.id },
  });
  const maxRivals = settings?.max_active_rivals || 3;

  if (rivalCount >= maxRivals) {
    return Errors.invalidInput(`Maximum ${maxRivals} rivals allowed`);
  }

  // Build config (phantom config for AI, victory config for friends)
  let phantomConfig: Record<string, unknown> | undefined = undefined;

  if (body.rivalType === "FRIEND") {
    // Store victory condition for friend rivals (defaults to "rival")
    const victoryCondition = body.phantomConfig?.personality || "rival";
    phantomConfig = {
      personality: victoryCondition,
      victoryCondition: true, // Flag to indicate this is a friend with custom victory condition
    };
  } else if (body.rivalType === "AI_PHANTOM") {
    const difficulty = getSuggestedPhantomDifficulty(userLevel);
    const defaultConfig = createDefaultPhantomConfig(difficulty.personality);

    const personality =
      body.phantomConfig?.personality || defaultConfig.personality;

    // Use provided archetype to find character, or assign one based on personality
    let character;
    if (body.phantomConfig?.archetype) {
      // User selected a specific character - find it by ID
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

    phantomConfig = {
      personality,
      rubberBandStrength: difficulty.rubberBandStrength,
      volatility: difficulty.volatility,
      name: body.phantomConfig?.name || character.name,
      archetype: character.id,
      // Character visual identity
      characterId: character.id,
      avatar: character.avatar,
      color: character.color,
      tagline: character.tagline,
    };
  }

  // Create the rival
  const rival = await prisma.fitness_rivals.create({
    data: {
      user_id: user.id,
      rival_type: body.rivalType,
      friend_id: body.rivalType === "FRIEND" ? body.friendId : null,
      phantom_config: phantomConfig as Prisma.InputJsonValue | undefined,
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
    id: rival.id,
    rivalType: rival.rival_type === "AI_PHANTOM" ? "ai_phantom" : "friend",
    friendId: rival.friend_id,
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
  });
});
