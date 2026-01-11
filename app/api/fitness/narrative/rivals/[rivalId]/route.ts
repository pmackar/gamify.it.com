/**
 * Narrative Engine - Individual Rival API
 *
 * GET: Get rival details
 * PATCH: Update rival (e.g., rename phantom)
 * DELETE: Remove rival
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { withAuthParams, validateBody, Errors } from "@/lib/api";
import prisma from "@/lib/db";

// Schema for updating a rival
const updateRivalSchema = z.object({
  phantomConfig: z
    .object({
      name: z.string().optional(),
      archetype: z.string().optional(),
      personality: z.enum(["mirror", "rival", "mentor", "nemesis"]).optional(),
    })
    .optional(),
});

// GET /api/fitness/narrative/rivals/[rivalId] - Get rival details
export const GET = withAuthParams<{ rivalId: string }>(
  async (_request, user, params) => {
    const { rivalId } = params;

    const rival = await prisma.fitness_rivals.findFirst({
      where: {
        id: rivalId,
        user_id: user.id,
      },
    });

    if (!rival) {
      return Errors.notFound("Rival not found");
    }

    // Get friend profile if friend rival
    let friendProfile = null;
    if (rival.rival_type === "FRIEND" && rival.friend_id) {
      const profile = await prisma.profiles.findUnique({
        where: { id: rival.friend_id },
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
          main_level: true,
        },
      });
      if (profile) {
        friendProfile = {
          id: profile.id,
          username: profile.username,
          displayName: profile.display_name,
          avatarUrl: profile.avatar_url,
          level: profile.main_level || 1,
        };
      }
    }

    // Get recent encounters
    const recentEncounters = await prisma.fitness_encounters.findMany({
      where: {
        user_id: user.id,
        rival_id: rivalId,
      },
      orderBy: { encounter_date: "desc" },
      take: 10,
    });

    return NextResponse.json({
      id: rival.id,
      rivalType: rival.rival_type === "AI_PHANTOM" ? "ai_phantom" : "friend",
      friendId: rival.friend_id,
      friendProfile,
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
      recentEncounters: recentEncounters.map((e) => ({
        id: e.id,
        winner: e.winner.toLowerCase(),
        winningMargin: e.winning_margin,
        dominantFactor: e.dominant_factor,
        userMetrics: e.user_metrics,
        rivalMetrics: e.rival_metrics,
        respectDelta: e.respect_delta,
        heatDelta: e.heat_delta,
        encounterDate: e.encounter_date.toISOString(),
      })),
    });
  }
);

// PATCH /api/fitness/narrative/rivals/[rivalId] - Update rival
export const PATCH = withAuthParams<{ rivalId: string }>(
  async (request, user, params) => {
    const { rivalId } = params;

    const body = await validateBody(request, updateRivalSchema);
    if (body instanceof NextResponse) return body;

    // Find existing rival
    const rival = await prisma.fitness_rivals.findFirst({
      where: {
        id: rivalId,
        user_id: user.id,
      },
    });

    if (!rival) {
      return Errors.notFound("Rival not found");
    }

    // Only AI phantoms can have their config updated
    if (rival.rival_type !== "AI_PHANTOM" && body.phantomConfig) {
      return Errors.invalidInput(
        "Cannot update phantom config for friend rivals"
      );
    }

    // Merge phantom config updates
    let updatedPhantomConfig: Record<string, unknown> | undefined =
      rival.phantom_config as unknown as Record<string, unknown> | undefined;
    if (body.phantomConfig && rival.rival_type === "AI_PHANTOM") {
      const existingConfig = updatedPhantomConfig || {};
      updatedPhantomConfig = {
        ...existingConfig,
        ...body.phantomConfig,
      };
    }

    // Update the rival
    const updated = await prisma.fitness_rivals.update({
      where: { id: rivalId },
      data: {
        phantom_config: updatedPhantomConfig as Prisma.InputJsonValue | undefined,
      },
    });

    return NextResponse.json({
      id: updated.id,
      rivalType: updated.rival_type === "AI_PHANTOM" ? "ai_phantom" : "friend",
      phantomConfig: updated.phantom_config,
      respectLevel: updated.respect_level,
      rivalryHeat: updated.rivalry_heat,
    });
  }
);

// DELETE /api/fitness/narrative/rivals/[rivalId] - Remove rival
export const DELETE = withAuthParams<{ rivalId: string }>(
  async (_request, user, params) => {
    const { rivalId } = params;

    // First check if it's an AI phantom rival
    const aiRival = await prisma.fitness_rivals.findFirst({
      where: {
        id: rivalId,
        user_id: user.id,
      },
    });

    if (aiRival) {
      // Delete associated encounters
      await prisma.fitness_encounters.deleteMany({
        where: {
          user_id: user.id,
          rival_id: rivalId,
        },
      });

      // Delete the AI rival
      await prisma.fitness_rivals.delete({
        where: { id: rivalId },
      });

      return NextResponse.json({ success: true });
    }

    // Check if it's a friend rivalry
    const friendRivalry = await prisma.fitness_friend_rivalries.findFirst({
      where: {
        id: rivalId,
        OR: [{ user1_id: user.id }, { user2_id: user.id }],
      },
    });

    if (friendRivalry) {
      // Delete the friend rivalry (soft delete by setting is_active to false, or hard delete)
      await prisma.fitness_friend_rivalries.delete({
        where: { id: rivalId },
      });

      return NextResponse.json({ success: true });
    }

    return Errors.notFound("Rival not found");
  }
);
