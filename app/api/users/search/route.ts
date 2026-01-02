import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/users/search?q=query - Search users by username or display name
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    if (query.length < 2) {
      return NextResponse.json({
        data: [],
        message: "Query must be at least 2 characters",
      });
    }

    // Search users by username or display name (case insensitive)
    const users = await prisma.profiles.findMany({
      where: {
        id: { not: user.id }, // Exclude current user
        OR: [
          { username: { contains: query, mode: "insensitive" } },
          { display_name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        username: true,
        display_name: true,
        avatar_url: true,
        main_level: true,
      },
      take: limit,
    });

    // Get friendship status for each user
    const userIds = users.map((u) => u.id);
    const friendships = await prisma.friendships.findMany({
      where: {
        OR: [
          { requester_id: user.id, addressee_id: { in: userIds } },
          { requester_id: { in: userIds }, addressee_id: user.id },
        ],
      },
    });

    // Map friendship status
    const friendshipMap = new Map<string, { status: string; isRequester: boolean; friendshipId: string }>();
    for (const f of friendships) {
      const otherId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
      friendshipMap.set(otherId, {
        status: f.status,
        isRequester: f.requester_id === user.id,
        friendshipId: f.id,
      });
    }

    const data = users.map((u) => {
      const friendship = friendshipMap.get(u.id);
      return {
        id: u.id,
        username: u.username,
        displayName: u.display_name,
        avatarUrl: u.avatar_url,
        level: u.main_level || 1,
        friendshipStatus: friendship?.status || null,
        isPendingFromThem: friendship?.status === "PENDING" && !friendship.isRequester,
        friendshipId: friendship?.friendshipId || null,
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error searching users:", error);
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
}
