import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/friends/requests - List pending incoming friend requests
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "incoming"; // 'incoming' or 'sent'
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    const whereClause = type === "sent"
      ? { requester_id: user.id, status: "PENDING" as const }
      : { addressee_id: user.id, status: "PENDING" as const };

    const requests = await prisma.friendships.findMany({
      where: whereClause,
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
      orderBy: { created_at: "desc" },
      take: limit,
      skip: offset,
    });

    // Map to request objects with the relevant user
    const data = requests.map((r) => {
      const otherUser = type === "sent" ? r.addressee : r.requester;
      return {
        friendshipId: r.id,
        id: otherUser.id,
        username: otherUser.username,
        displayName: otherUser.display_name,
        avatarUrl: otherUser.avatar_url,
        level: otherUser.main_level || 1,
        requestedAt: r.created_at,
      };
    });

    const total = await prisma.friendships.count({ where: whereClause });

    return NextResponse.json({
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + data.length < total,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching friend requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch friend requests" },
      { status: 500 }
    );
  }
}
