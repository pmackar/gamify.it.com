import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/db";

// DELETE /api/friends/[friendshipId] - Remove a friend
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ friendshipId: string }> }
) {
  try {
    const user = await requireAuth();
    const { friendshipId } = await params;

    // Find the friendship
    const friendship = await prisma.friendships.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      return NextResponse.json(
        { error: "Friendship not found" },
        { status: 404 }
      );
    }

    // Ensure the current user is part of this friendship
    if (friendship.requester_id !== user.id && friendship.addressee_id !== user.id) {
      return NextResponse.json(
        { error: "Not authorized to modify this friendship" },
        { status: 403 }
      );
    }

    // Delete the friendship
    await prisma.friendships.delete({
      where: { id: friendshipId },
    });

    return NextResponse.json({
      message: "Friend removed successfully",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error removing friend:", error);
    return NextResponse.json(
      { error: "Failed to remove friend" },
      { status: 500 }
    );
  }
}
