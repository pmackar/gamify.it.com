import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/friends - List accepted friends
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get accepted friendships where user is either requester or addressee
    const friendships = await prisma.friendships.findMany({
      where: {
        status: "ACCEPTED",
        OR: [
          { requester_id: user.id },
          { addressee_id: user.id },
        ],
      },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
            main_level: true,
          },
        },
        addressee: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
            main_level: true,
          },
        },
      },
      orderBy: { accepted_at: "desc" },
      take: limit,
      skip: offset,
    });

    // Map to friend objects (the other user in each friendship)
    const friends = friendships.map((f) => {
      const friend = f.requester_id === user.id ? f.addressee : f.requester;
      return {
        friendshipId: f.id,
        id: friend.id,
        username: friend.username,
        displayName: friend.display_name,
        avatarUrl: friend.avatar_url,
        level: friend.main_level || 1,
        friendSince: f.accepted_at,
      };
    });

    const total = await prisma.friendships.count({
      where: {
        status: "ACCEPTED",
        OR: [
          { requester_id: user.id },
          { addressee_id: user.id },
        ],
      },
    });

    return NextResponse.json({
      data: friends,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + friends.length < total,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching friends:", error);
    return NextResponse.json(
      { error: "Failed to fetch friends" },
      { status: 500 }
    );
  }
}
