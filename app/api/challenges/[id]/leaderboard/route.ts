import { NextResponse } from "next/server";
import { withAuthParams, Errors } from "@/lib/api";
import prisma from "@/lib/db";

// Helper to calculate scores based on challenge type
async function calculateScores(
  challenge: {
    id: string;
    type: string;
    app_id: string;
    metric: string;
    start_date: Date;
    end_date: Date;
  },
  participantUserIds: string[]
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  const startDate = challenge.start_date;
  const endDate = challenge.end_date;

  switch (challenge.type) {
    case "FITNESS_WORKOUTS":
    case "FITNESS_VOLUME":
    case "FITNESS_XP": {
      // Get fitness data for all participants
      const fitnessData = await prisma.gamify_fitness_data.findMany({
        where: { user_id: { in: participantUserIds } },
      });

      for (const data of fitnessData) {
        const parsed = data.data as {
          workouts?: Array<{
            date: string;
            exercises?: Array<{
              sets?: Array<{ weight?: number; reps?: number }>;
            }>;
          }>;
          xp?: number;
        };

        if (!parsed.workouts) {
          scores.set(data.user_id, 0);
          continue;
        }

        // Filter workouts within challenge period
        const relevantWorkouts = parsed.workouts.filter((w) => {
          const workoutDate = new Date(w.date);
          return workoutDate >= startDate && workoutDate <= endDate;
        });

        let score = 0;
        if (challenge.type === "FITNESS_WORKOUTS") {
          score = relevantWorkouts.length;
        } else if (challenge.type === "FITNESS_VOLUME") {
          // Sum total volume (weight * reps)
          for (const workout of relevantWorkouts) {
            for (const exercise of workout.exercises || []) {
              for (const set of exercise.sets || []) {
                score += (set.weight || 0) * (set.reps || 0);
              }
            }
          }
        } else if (challenge.type === "FITNESS_XP") {
          // Would need to track XP earned during period - simplified
          score = relevantWorkouts.length * 25; // Approximate XP per workout
        }

        scores.set(data.user_id, score);
      }
      break;
    }

    case "TRAVEL_LOCATIONS":
    case "TRAVEL_CITIES": {
      for (const userId of participantUserIds) {
        let score = 0;

        if (challenge.type === "TRAVEL_LOCATIONS") {
          // Count locations visited during challenge period
          const visits = await prisma.travel_user_location_data.count({
            where: {
              user_id: userId,
              visited: true,
              first_visited_at: {
                gte: startDate,
                lte: endDate,
              },
            },
          });
          score = visits;
        } else {
          // Count cities with activity during period
          const cities = await prisma.travel_cities.count({
            where: {
              user_id: userId,
              first_visited: {
                gte: startDate,
                lte: endDate,
              },
            },
          });
          score = cities;
        }

        scores.set(userId, score);
      }
      break;
    }

    case "TODAY_HABITS":
    case "TODAY_STREAK": {
      // Get today app data
      const todayData = await prisma.gamify_today_data.findMany({
        where: { user_id: { in: participantUserIds } },
      });

      for (const data of todayData) {
        const parsed = data.data as {
          habits?: Array<{
            completedDates?: string[];
          }>;
          currentStreak?: number;
        };

        let score = 0;

        if (challenge.type === "TODAY_HABITS" && parsed.habits) {
          // Count habit completions during period
          for (const habit of parsed.habits) {
            const completions = (habit.completedDates || []).filter((d) => {
              const date = new Date(d);
              return date >= startDate && date <= endDate;
            });
            score += completions.length;
          }
        } else if (challenge.type === "TODAY_STREAK") {
          score = parsed.currentStreak || 0;
        }

        scores.set(data.user_id, score);
      }
      break;
    }

    default:
      // Custom - no automatic calculation
      break;
  }

  return scores;
}

// GET /api/challenges/[id]/leaderboard - Get challenge leaderboard with updated scores
export const GET = withAuthParams<{ id: string }>(
  async (_request, user, { id }) => {
    const challenge = await prisma.challenges.findUnique({
      where: { id },
      include: {
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
        },
      },
    });

    if (!challenge) {
      return Errors.notFound("Challenge not found");
    }

    const participantUserIds = challenge.participants.map((p) => p.user_id);

    // Calculate current scores
    const scores = await calculateScores(
      {
        id: challenge.id,
        type: challenge.type,
        app_id: challenge.app_id,
        metric: challenge.metric,
        start_date: challenge.start_date,
        end_date: challenge.end_date,
      },
      participantUserIds
    );

    // Update scores in database and build leaderboard
    const leaderboard = [];
    for (const participant of challenge.participants) {
      const score = scores.get(participant.user_id) || participant.score;

      // Update score if changed
      if (score !== participant.score) {
        await prisma.challenge_participants.update({
          where: { id: participant.id },
          data: { score, last_updated: new Date() },
        });
      }

      leaderboard.push({
        userId: participant.user_id,
        user: {
          id: participant.user.id,
          username: participant.user.username,
          displayName: participant.user.display_name,
          avatarUrl: participant.user.avatar_url,
        },
        score,
        isCurrentUser: participant.user_id === user.id,
      });
    }

    // Sort by score descending and assign ranks
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard.forEach((entry, index) => {
      (entry as Record<string, unknown>).rank = index + 1;
    });

    // Update ranks in database
    for (const entry of leaderboard) {
      await prisma.challenge_participants.updateMany({
        where: {
          challenge_id: id,
          user_id: entry.userId,
        },
        data: { rank: (entry as Record<string, unknown>).rank as number },
      });
    }

    return NextResponse.json({
      challenge: {
        id: challenge.id,
        title: challenge.title,
        type: challenge.type,
        target: challenge.target,
        startDate: challenge.start_date.toISOString(),
        endDate: challenge.end_date.toISOString(),
        status: challenge.status,
        xpReward: challenge.xp_reward,
      },
      leaderboard,
      currentUserRank: leaderboard.find((e) => e.isCurrentUser)
        ? (leaderboard.find((e) => e.isCurrentUser) as Record<string, unknown>)
            .rank
        : null,
    });
  }
);
