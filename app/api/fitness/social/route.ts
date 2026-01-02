import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUser } from "@/lib/auth";

// GET /api/fitness/social - Get friends' recent workouts and leaderboard
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "feed"; // feed | leaderboard

  // Get user's friends
  const friendships = await prisma.friendships.findMany({
    where: {
      OR: [
        { user_id: user.id, status: "ACCEPTED" },
        { friend_id: user.id, status: "ACCEPTED" },
      ],
    },
    select: {
      user_id: true,
      friend_id: true,
    },
  });

  const friendIds = friendships.map((f) =>
    f.user_id === user.id ? f.friend_id : f.user_id
  );

  if (type === "leaderboard") {
    // Get leaderboard: all friends + self, sorted by fitness XP
    const allIds = [...friendIds, user.id];

    const profiles = await prisma.profiles.findMany({
      where: { id: { in: allIds } },
      select: {
        id: true,
        display_name: true,
        username: true,
        avatar_url: true,
        email: true,
      },
    });

    // Get fitness data for all users
    const fitnessData = await prisma.gamify_fitness_data.findMany({
      where: { user_id: { in: allIds } },
    });

    // Build leaderboard
    const leaderboard = profiles
      .map((profile) => {
        const fitness = fitnessData.find((f) => f.user_id === profile.id);
        const data = (fitness?.data as any) || {};
        const profileData = data.profile || {};

        return {
          id: profile.id,
          name: profile.display_name || profile.username || profile.email?.split("@")[0] || "User",
          avatar_url: profile.avatar_url,
          is_self: profile.id === user.id,
          level: profileData.level || 1,
          xp: profileData.xp || 0,
          total_workouts: profileData.totalWorkouts || 0,
          total_volume: profileData.totalVolume || 0,
        };
      })
      .sort((a, b) => b.xp - a.xp)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    return NextResponse.json({ leaderboard });
  }

  // Default: Activity feed
  if (friendIds.length === 0) {
    return NextResponse.json({ feed: [], message: "No friends yet" });
  }

  // Get friends' fitness data
  const friendsData = await prisma.gamify_fitness_data.findMany({
    where: { user_id: { in: friendIds } },
  });

  // Get friend profiles
  const friendProfiles = await prisma.profiles.findMany({
    where: { id: { in: friendIds } },
    select: {
      id: true,
      display_name: true,
      username: true,
      avatar_url: true,
      email: true,
    },
  });

  // Extract recent workouts from friends' data
  const feed: any[] = [];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  for (const friendData of friendsData) {
    const profile = friendProfiles.find((p) => p.id === friendData.user_id);
    if (!profile) continue;

    const data = friendData.data as any;
    const workouts = data.workouts || [];

    // Get workouts from the last 7 days
    for (const workout of workouts) {
      const workoutDate = new Date(workout.endTime || workout.startTime);
      if (workoutDate >= sevenDaysAgo) {
        const totalSets = workout.exercises?.reduce(
          (sum: number, ex: any) => sum + (ex.sets?.length || 0),
          0
        ) || 0;
        const totalVolume = workout.exercises?.reduce(
          (sum: number, ex: any) =>
            sum +
            (ex.sets?.reduce(
              (setSum: number, s: any) => setSum + (s.weight || 0) * (s.reps || 0),
              0
            ) || 0),
          0
        ) || 0;

        feed.push({
          id: `${friendData.user_id}-${workout.id}`,
          type: "workout",
          user: {
            id: profile.id,
            name: profile.display_name || profile.username || profile.email?.split("@")[0] || "User",
            avatar_url: profile.avatar_url,
          },
          workout: {
            id: workout.id,
            exercises: workout.exercises?.length || 0,
            sets: totalSets,
            volume: totalVolume,
            duration: workout.duration || 0,
            xp: workout.totalXP || 0,
          },
          timestamp: workout.endTime || workout.startTime,
        });
      }
    }
  }

  // Sort by timestamp (newest first)
  feed.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return NextResponse.json({ feed: feed.slice(0, 20) });
}
