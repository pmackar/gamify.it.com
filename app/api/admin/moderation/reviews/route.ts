import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { requireAdmin } from "@/lib/permissions-server";
import prisma from "@/lib/db";

export const GET = withAuth(async (request, user) => {
  await requireAdmin(user.id);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "PENDING";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where = {
      status: status as "PENDING" | "APPROVED" | "REJECTED",
    };

    const [reviews, total] = await Promise.all([
      prisma.travel_reviews.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              email: true,
              username: true,
              display_name: true,
              avatar_url: true,
            },
          },
          location: {
            select: {
              id: true,
              name: true,
              location_type: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
      prisma.travel_reviews.count({ where }),
    ]);

  return NextResponse.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      rating: r.rating,
      status: r.status,
      created_at: r.created_at.toISOString(),
      moderated_at: r.moderated_at?.toISOString() || null,
      author: r.author,
      location: r.location,
    })),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

export const PATCH = withAuth(async (request, user) => {
  await requireAdmin(user.id);

    const body = await request.json();
    const { reviewId, action } = body;

    if (!reviewId || !action) {
      return NextResponse.json(
        { error: "Missing reviewId or action" },
        { status: 400 }
      );
    }

    if (!["APPROVED", "REJECTED"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be APPROVED or REJECTED" },
        { status: 400 }
      );
    }

    const review = await prisma.travel_reviews.update({
      where: { id: reviewId },
      data: {
        status: action,
        moderated_at: new Date(),
        moderated_by: user.id,
      },
    });

  return NextResponse.json({
    success: true,
    review: {
      id: review.id,
      status: review.status,
      moderated_at: review.moderated_at?.toISOString(),
    },
  });
});
