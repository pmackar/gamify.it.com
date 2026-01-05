import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthParams, Errors } from "@/lib/api";
import prisma from "@/lib/db";
import { addXP } from "@/lib/gamification";

const CreateReviewSchema = z.object({
  title: z.string().max(100).optional(),
  content: z.string().min(1).max(2000),
  rating: z.number().int().min(1).max(5).optional(),
});

// GET /api/locations/[id]/reviews - List reviews for a location
export const GET = withAuthParams<{ id: string }>(
  async (request, user, { id: locationId }) => {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort") || "recent";

    // Build orderBy based on sort parameter
    let orderBy: Record<string, string> = { created_at: "desc" };
    if (sort === "helpful") {
      // We don't have helpfulCount in schema, so use rating as proxy
      orderBy = { rating: "desc" };
    } else if (sort === "rating") {
      orderBy = { rating: "desc" };
    }

    // Fetch approved reviews only
    const reviews = await prisma.travel_reviews.findMany({
      where: {
        location_id: locationId,
        status: { in: ["PENDING", "APPROVED"] }, // Show pending to allow immediate feedback
      },
      orderBy,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar_url: true,
          },
        },
      },
    });

    // Check if current user has reviewed
    const userReview = await prisma.travel_reviews.findFirst({
      where: {
        location_id: locationId,
        author_id: user.id,
      },
      select: { id: true },
    });

    return NextResponse.json({
      data: reviews.map((review) => ({
        id: review.id,
        title: review.title,
        content: review.content,
        rating: review.rating,
        helpfulCount: 0, // Not tracked yet
        createdAt: review.created_at.toISOString(),
        author: {
          id: review.author.id,
          username: review.author.username,
          avatarUrl: review.author.avatar_url,
        },
      })),
      userHasReviewed: !!userReview,
    });
  }
);

// POST /api/locations/[id]/reviews - Create a review
export const POST = withAuthParams<{ id: string }>(
  async (request, user, { id: locationId }) => {
    const body = await request.json();
    const parsed = CreateReviewSchema.safeParse(body);

    if (!parsed.success) {
      return Errors.invalidInput("Review content is required");
    }

    const { title, content, rating = 5 } = parsed.data;

    // Check if location exists
    const location = await prisma.travel_locations.findUnique({
      where: { id: locationId },
      select: { id: true, type: true, name: true },
    });

    if (!location) {
      return Errors.notFound("Location not found");
    }

    // Check if user already reviewed
    const existingReview = await prisma.travel_reviews.findFirst({
      where: {
        location_id: locationId,
        author_id: user.id,
      },
    });

    if (existingReview) {
      return Errors.invalidInput("You have already reviewed this location");
    }

    // Create the review
    const review = await prisma.travel_reviews.create({
      data: {
        title: title?.trim() || null,
        content: content.trim(),
        rating,
        author_id: user.id,
        location_id: locationId,
        status: "PENDING", // Reviews start as pending for moderation
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar_url: true,
          },
        },
      },
    });

    // Award XP for review
    try {
      await addXP(user.id, "visit_with_review", location.type || "other", {
        locationId,
        locationName: location.name,
        reviewId: review.id,
      });
    } catch (err) {
      console.error("Failed to award XP for review:", err);
      // Don't fail the request if XP fails
    }

    // Update location rating stats
    const allRatings = await prisma.travel_reviews.aggregate({
      where: {
        location_id: locationId,
        status: { in: ["PENDING", "APPROVED"] },
      },
      _avg: { rating: true },
      _count: true,
    });

    await prisma.travel_locations.update({
      where: { id: locationId },
      data: {
        avg_rating: allRatings._avg.rating || 0,
        rating_count: allRatings._count,
      },
    });

    return NextResponse.json({
      data: {
        id: review.id,
        title: review.title,
        content: review.content,
        rating: review.rating,
        helpfulCount: 0,
        createdAt: review.created_at.toISOString(),
        author: {
          id: review.author.id,
          username: review.author.username,
          avatarUrl: review.author.avatar_url,
        },
      },
      xpAwarded: 60, // Let the frontend know XP was earned
    });
  }
);
