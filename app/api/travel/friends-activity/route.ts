import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/travel/friends-activity - Get friends' recent travel activity
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

  // Get user's friends
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

  const friendIds = friendships.map((f) =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  );

  if (friendIds.length === 0) {
    return NextResponse.json({ activities: [] });
  }

  // Get recent visits from friends
  const recentVisits = await prisma.travel_user_location_data.findMany({
    where: {
      user_id: { in: friendIds },
      visited: true,
      visited_at: { not: null },
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
          main_level: true,
        },
      },
      location: {
        select: {
          id: true,
          name: true,
          type: true,
          city: {
            select: {
              id: true,
              name: true,
              country: true,
            },
          },
        },
      },
    },
    orderBy: {
      visited_at: "desc",
    },
    take: limit,
  });

  // Get recent hotlist additions
  const recentHotlists = await prisma.travel_user_location_data.findMany({
    where: {
      user_id: { in: friendIds },
      hotlist: true,
      updated_at: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      },
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
          main_level: true,
        },
      },
      location: {
        select: {
          id: true,
          name: true,
          type: true,
          city: {
            select: {
              id: true,
              name: true,
              country: true,
            },
          },
        },
      },
    },
    orderBy: {
      updated_at: "desc",
    },
    take: limit,
  });

  // Combine and sort activities
  type ActivityType = "visited" | "hotlisted";

  interface Activity {
    id: string;
    type: ActivityType;
    user: {
      id: string;
      username: string | null;
      displayName: string | null;
      avatarUrl: string | null;
      level: number;
    };
    location: {
      id: string;
      name: string;
      type: string;
      city: {
        id: string;
        name: string;
        country: string;
      } | null;
    };
    rating: number | null;
    timestamp: Date;
  }

  const activities: Activity[] = [];

  for (const visit of recentVisits) {
    if (visit.location) {
      activities.push({
        id: `visit-${visit.user_id}-${visit.location_id}`,
        type: "visited",
        user: {
          id: visit.user.id,
          username: visit.user.username,
          displayName: visit.user.display_name,
          avatarUrl: visit.user.avatar_url,
          level: visit.user.main_level || 1,
        },
        location: {
          id: visit.location.id,
          name: visit.location.name,
          type: visit.location.type,
          city: visit.location.city,
        },
        rating: visit.personal_rating ? Number(visit.personal_rating) : null,
        timestamp: visit.visited_at!,
      });
    }
  }

  for (const hotlist of recentHotlists) {
    if (hotlist.location) {
      activities.push({
        id: `hotlist-${hotlist.user_id}-${hotlist.location_id}`,
        type: "hotlisted",
        user: {
          id: hotlist.user.id,
          username: hotlist.user.username,
          displayName: hotlist.user.display_name,
          avatarUrl: hotlist.user.avatar_url,
          level: hotlist.user.main_level || 1,
        },
        location: {
          id: hotlist.location.id,
          name: hotlist.location.name,
          type: hotlist.location.type,
          city: hotlist.location.city,
        },
        rating: null,
        timestamp: hotlist.updated_at!,
      });
    }
  }

  // Sort by timestamp and take top items
  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const topActivities = activities.slice(0, limit);

  return NextResponse.json({
    activities: topActivities.map((a) => ({
      ...a,
      timestamp: a.timestamp.toISOString(),
    })),
  });
}
