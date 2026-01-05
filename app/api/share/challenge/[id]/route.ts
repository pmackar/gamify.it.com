import { NextResponse } from "next/server";
import { withAuthParams, Errors } from "@/lib/api";
import prisma from "@/lib/db";

// GET /api/share/challenge/[id] - Get shareable challenge data
export const GET = withAuthParams<{ id: string }>(
  async (_request, user, { id }) => {
    const challenge = await prisma.challenges.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
          },
        },
        participants: {
          where: { status: "JOINED" },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                display_name: true,
                avatar_url: true,
              },
            },
          },
          orderBy: { score: "desc" },
          take: 5,
        },
      },
    });

    if (!challenge) {
      return Errors.notFound("Challenge not found");
    }

    // Check if user is part of challenge
    const isParticipant = challenge.participants.some(
      (p) => p.user_id === user.id
    );
    const isCreator = challenge.creator_id === user.id;

    if (!isParticipant && !isCreator) {
      return Errors.forbidden("Not authorized to share this challenge");
    }

    const userParticipant = challenge.participants.find(
      (p) => p.user_id === user.id
    );

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://gamify.it.com";
    const shareUrl = `${baseUrl}/share/challenge/${id}`;

    // Calculate days remaining
    const now = new Date();
    const endDate = new Date(challenge.end_date);
    const daysRemaining = Math.max(
      0,
      Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    return NextResponse.json({
      share: {
        type: "challenge",
        id,
        title: challenge.title,
        description: challenge.description,
        icon: challenge.icon || "🏆",
        appId: challenge.app_id,
        challengeType: challenge.type,
        status: challenge.status,
        startDate: challenge.start_date.toISOString(),
        endDate: challenge.end_date.toISOString(),
        daysRemaining,
        xpReward: challenge.xp_reward,
        participantCount: challenge.participants.length,
        leaderboard: challenge.participants.slice(0, 3).map((p, i) => ({
          rank: i + 1,
          displayName: p.user.display_name || p.user.username,
          avatarUrl: p.user.avatar_url,
          score: p.score,
          isCurrentUser: p.user_id === user.id,
        })),
        userRank: userParticipant
          ? challenge.participants.findIndex((p) => p.user_id === user.id) + 1
          : null,
        userScore: userParticipant?.score || 0,
        creator: {
          displayName:
            challenge.creator.display_name || challenge.creator.username,
          avatarUrl: challenge.creator.avatar_url,
        },
        shareUrl,
        socialText: `I'm competing in "${challenge.title}" on gamify.it.com! ${challenge.icon || "🏆"} ${
          userParticipant
            ? `Currently ranked #${challenge.participants.findIndex((p) => p.user_id === user.id) + 1}`
            : ""
        }`,
        ogImage: `${baseUrl}/api/og/challenge/${id}`,
      },
    });
  }
);
