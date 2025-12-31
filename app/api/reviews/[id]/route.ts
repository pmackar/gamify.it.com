import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { checkForSpam } from '@/lib/moderation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/reviews/[id] - Get a single review
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
      },
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json({ data: review });
  } catch (error) {
    console.error('Error fetching review:', error);
    return NextResponse.json({ error: 'Failed to fetch review' }, { status: 500 });
  }
}

// PUT /api/reviews/[id] - Update a review
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    // Check review exists and user owns it
    const existing = await prisma.review.findUnique({
      where: { id },
      select: { authorId: true, locationId: true, status: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    if (existing.authorId !== user.id) {
      return NextResponse.json({ error: 'You can only edit your own reviews' }, { status: 403 });
    }

    const { title, content, rating } = body;

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Check for spam if content is being updated
    let newStatus = existing.status;
    let flagReason = null;

    if (content) {
      const spamCheck = checkForSpam(content, title);
      if (spamCheck.isSpam) {
        newStatus = 'FLAGGED';
        flagReason = spamCheck.reason;
      }
    }

    const review = await prisma.review.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(rating !== undefined && { rating }),
        status: newStatus,
        flagReason,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Update location stats if rating changed
    if (rating !== undefined) {
      await updateLocationReviewStats(existing.locationId);
    }

    return NextResponse.json({
      data: review,
      message: newStatus === 'FLAGGED'
        ? 'Your updated review has been submitted for moderation.'
        : 'Review updated successfully!',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating review:', error);
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }
}

// DELETE /api/reviews/[id] - Delete a review
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Check review exists and user owns it
    const existing = await prisma.review.findUnique({
      where: { id },
      select: { authorId: true, locationId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    if (existing.authorId !== user.id) {
      return NextResponse.json({ error: 'You can only delete your own reviews' }, { status: 403 });
    }

    await prisma.review.delete({ where: { id } });

    // Update location stats
    await updateLocationReviewStats(existing.locationId);

    return NextResponse.json({ message: 'Review deleted' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error deleting review:', error);
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
  }
}

// Helper function to update location review statistics
async function updateLocationReviewStats(locationId: string) {
  const reviews = await prisma.review.findMany({
    where: {
      locationId,
      status: 'APPROVED',
    },
    select: { rating: true },
  });

  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : null;

  await prisma.location.update({
    where: { id: locationId },
    data: {
      totalReviews,
      averageRating,
    },
  });
}
