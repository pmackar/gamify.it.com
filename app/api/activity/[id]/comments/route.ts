import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/activity/[id]/comments - Get comments for an activity
export async function GET(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  // Verify user can see this activity (must be owner or actor's friend)
  const activity = await prisma.activity_feed.findUnique({
    where: { id },
    select: { user_id: true, actor_id: true },
  });

  if (!activity) {
    return NextResponse.json({ error: "Activity not found" }, { status: 404 });
  }

  // Check if user has access
  const hasAccess =
    activity.user_id === user.id ||
    activity.actor_id === user.id ||
    (await prisma.friendships.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { requester_id: user.id, addressee_id: activity.actor_id },
          { requester_id: activity.actor_id, addressee_id: user.id },
        ],
      },
    }));

  if (!hasAccess) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const comments = await prisma.activity_comments.findMany({
    where: { activity_id: id },
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
    orderBy: { created_at: "asc" },
  });

  return NextResponse.json({
    comments: comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.created_at.toISOString(),
      user: {
        id: c.user.id,
        username: c.user.username,
        displayName: c.user.display_name,
        avatarUrl: c.user.avatar_url,
      },
      isOwn: c.user_id === user.id,
    })),
  });
}

// POST /api/activity/[id]/comments - Add a comment
export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length === 0 || trimmedContent.length > 500) {
      return NextResponse.json(
        { error: "Comment must be 1-500 characters" },
        { status: 400 }
      );
    }

    // Verify activity exists and user can comment
    const activity = await prisma.activity_feed.findUnique({
      where: { id },
      select: { user_id: true, actor_id: true },
    });

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    // Check if user has access (must be owner, actor, or friend of actor)
    const hasAccess =
      activity.user_id === user.id ||
      activity.actor_id === user.id ||
      (await prisma.friendships.findFirst({
        where: {
          status: "ACCEPTED",
          OR: [
            { requester_id: user.id, addressee_id: activity.actor_id },
            { requester_id: activity.actor_id, addressee_id: user.id },
          ],
        },
      }));

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Create the comment
    const comment = await prisma.activity_comments.create({
      data: {
        activity_id: id,
        user_id: user.id,
        content: trimmedContent,
      },
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
    });

    // Notify the activity owner if commenter is different
    if (activity.actor_id !== user.id) {
      await prisma.activity_feed.create({
        data: {
          user_id: activity.actor_id,
          actor_id: user.id,
          type: "COMMENT",
          entity_type: "activity",
          entity_id: id,
          metadata: {
            commentId: comment.id,
            preview: trimmedContent.slice(0, 100),
          },
        },
      });
    }

    return NextResponse.json({
      comment: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.created_at.toISOString(),
        user: {
          id: comment.user.id,
          username: comment.user.username,
          displayName: comment.user.display_name,
          avatarUrl: comment.user.avatar_url,
        },
        isOwn: true,
      },
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}

// DELETE /api/activity/[id]/comments - Delete a comment (needs comment ID in body)
export async function DELETE(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { commentId } = body;

    if (!commentId) {
      return NextResponse.json({ error: "Comment ID is required" }, { status: 400 });
    }

    // Find the comment
    const comment = await prisma.activity_comments.findUnique({
      where: { id: commentId },
      select: { user_id: true },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Only the comment author can delete
    if (comment.user_id !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await prisma.activity_comments.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
