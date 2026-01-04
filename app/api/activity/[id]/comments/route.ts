import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthParams, Errors } from "@/lib/api";
import prisma from "@/lib/db";

const CommentSchema = z.object({
  content: z.string().min(1).max(500),
});

const DeleteCommentSchema = z.object({
  commentId: z.string().uuid(),
});

// GET /api/activity/[id]/comments - Get comments for an activity
export const GET = withAuthParams<{ id: string }>(
  async (_request, user, { id }) => {
    // Verify user can see this activity (must be owner or actor's friend)
    const activity = await prisma.activity_feed.findUnique({
      where: { id },
      select: { user_id: true, actor_id: true },
    });

    if (!activity) {
      return Errors.notFound("Activity not found");
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
      return Errors.forbidden("Access denied");
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
);

// POST /api/activity/[id]/comments - Add a comment
export const POST = withAuthParams<{ id: string }>(
  async (request, user, { id }) => {
    const body = await request.json();
    const parsed = CommentSchema.safeParse(body);

    if (!parsed.success) {
      return Errors.invalidInput("Comment must be 1-500 characters");
    }

    const trimmedContent = parsed.data.content.trim();

    // Verify activity exists and user can comment
    const activity = await prisma.activity_feed.findUnique({
      where: { id },
      select: { user_id: true, actor_id: true },
    });

    if (!activity) {
      return Errors.notFound("Activity not found");
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
      return Errors.forbidden("Access denied");
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
  }
);

// DELETE /api/activity/[id]/comments - Delete a comment (needs comment ID in body)
export const DELETE = withAuthParams<{ id: string }>(
  async (request, user, { id: _activityId }) => {
    const body = await request.json();
    const parsed = DeleteCommentSchema.safeParse(body);

    if (!parsed.success) {
      return Errors.invalidInput("Comment ID is required");
    }

    const { commentId } = parsed.data;

    // Find the comment
    const comment = await prisma.activity_comments.findUnique({
      where: { id: commentId },
      select: { user_id: true },
    });

    if (!comment) {
      return Errors.notFound("Comment not found");
    }

    // Only the comment author can delete
    if (comment.user_id !== user.id) {
      return Errors.forbidden("Access denied");
    }

    await prisma.activity_comments.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ success: true });
  }
);
