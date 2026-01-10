/**
 * Respond to a rivalry request (accept/decline)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, validateBody, Errors, SelectFields } from "@/lib/api";
import prisma from "@/lib/db";

const respondSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(["accept", "decline"]),
});

export const POST = withAuth(async (request, user) => {
  const body = await validateBody(request, respondSchema);
  if (body instanceof NextResponse) return body;

  // Find the request
  const rivalryRequest = await prisma.fitness_rivalry_requests.findUnique({
    where: { id: body.requestId },
    include: {
      requester: { select: SelectFields.userWithLevel },
      addressee: { select: SelectFields.userWithLevel },
    },
  });

  if (!rivalryRequest) {
    return Errors.notFound("Rivalry request not found");
  }

  // Must be the addressee to respond
  if (rivalryRequest.addressee_id !== user.id) {
    return Errors.forbidden("You can only respond to requests sent to you");
  }

  if (rivalryRequest.status !== "PENDING") {
    return Errors.conflict("This request has already been responded to");
  }

  if (body.action === "decline") {
    // Update request status to declined
    await prisma.fitness_rivalry_requests.update({
      where: { id: body.requestId },
      data: {
        status: "DECLINED",
        responded_at: new Date(),
      },
    });

    return NextResponse.json({
      type: "declined",
      message: "Rivalry request declined",
    });
  }

  // Accept the request - create the shared rivalry
  // Use a transaction to ensure both operations succeed
  const result = await prisma.$transaction(async (tx) => {
    // Update request status
    await tx.fitness_rivalry_requests.update({
      where: { id: body.requestId },
      data: {
        status: "ACCEPTED",
        responded_at: new Date(),
      },
    });

    // Create the shared rivalry record
    // user1 is always the requester, user2 is the addressee
    const rivalry = await tx.fitness_friend_rivalries.create({
      data: {
        user1_id: rivalryRequest.requester_id,
        user2_id: rivalryRequest.addressee_id,
        victory_condition: rivalryRequest.victory_condition,
        user1_wins: 0,
        user2_wins: 0,
        ties: 0,
        streak_count: 0,
        is_active: true,
      },
      include: {
        user1: { select: SelectFields.userWithLevel },
        user2: { select: SelectFields.userWithLevel },
      },
    });

    return rivalry;
  });

  // Notify the requester that their challenge was accepted
  await prisma.activity_feed.create({
    data: {
      user_id: rivalryRequest.requester_id,
      actor_id: user.id,
      type: "RIVALRY_REQUEST_ACCEPTED",
      entity_type: "rivalry",
      entity_id: result.id,
      metadata: {
        accepterName: rivalryRequest.addressee.display_name || rivalryRequest.addressee.username || "Someone",
        victoryCondition: rivalryRequest.victory_condition,
      },
    },
  });

  // Return the rivalry from the accepter's perspective
  return NextResponse.json({
    type: "accepted",
    rivalry: {
      id: result.id,
      rivalType: "friend",
      friendId: result.user1_id,
      friend: {
        id: result.user1.id,
        username: result.user1.username,
        displayName: result.user1.display_name,
        avatarUrl: result.user1.avatar_url,
        level: result.user1.main_level || 1,
      },
      victoryCondition: result.victory_condition,
      streakHolderId: result.streak_holder_id,
      streakCount: result.streak_count,
      lastShowdown: null,
      createdAt: result.created_at.toISOString(),
      headToHead: {
        userWins: result.user2_wins, // From accepter's perspective
        rivalWins: result.user1_wins,
        ties: result.ties,
      },
    },
  });
});
