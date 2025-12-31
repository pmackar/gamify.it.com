import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { canTransitionStatus } from '@/lib/moderation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/admin/reviews/[id] - Moderate a review
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const { action, notes } = body;

    if (!action || !['APPROVE', 'REJECT', 'SPAM'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be APPROVE, REJECT, or SPAM' },
        { status: 400 }
      );
    }

    // Get current review
    const review = await prisma.review.findUnique({
      where: { id },
      select: { id: true, status: true, locationId: true },
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Map action to status
    const statusMap: Record<string, string> = {
      APPROVE: 'APPROVED',
      REJECT: 'REJECTED',
      SPAM: 'SPAM',
    };
    const newStatus = statusMap[action];

    // Validate status transition
    if (!canTransitionStatus(review.status, newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${review.status} to ${newStatus}` },
        { status: 400 }
      );
    }

    // Update review
    const updated = await prisma.review.update({
      where: { id },
      data: {
        status: newStatus as 'APPROVED' | 'REJECTED' | 'SPAM',
        moderatedById: admin.id,
        moderatedAt: new Date(),
        moderationNotes: notes || null,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Update location stats if approving/rejecting
    await updateLocationReviewStats(review.locationId);

    return NextResponse.json({
      data: updated,
      message: `Review ${action.toLowerCase()}ed successfully`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error moderating review:', error);
    return NextResponse.json({ error: 'Failed to moderate review' }, { status: 500 });
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
