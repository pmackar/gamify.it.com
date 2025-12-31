import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Flag reasons that users can select
const VALID_FLAG_REASONS = [
  'SPAM',
  'INAPPROPRIATE',
  'HARASSMENT',
  'MISINFORMATION',
  'OFF_TOPIC',
  'OTHER',
] as const;

type FlagReason = (typeof VALID_FLAG_REASONS)[number];

// POST /api/reviews/[id]/flag - Flag a review for moderation
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id: reviewId } = await params;
    const body = await request.json();

    const { reason, details } = body;

    // Validate reason
    if (!reason || !VALID_FLAG_REASONS.includes(reason as FlagReason)) {
      return NextResponse.json(
        { error: 'Invalid flag reason', validReasons: VALID_FLAG_REASONS },
        { status: 400 }
      );
    }

    // Check review exists
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true, authorId: true, status: true, flagCount: true },
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Can't flag your own review
    if (review.authorId === user.id) {
      return NextResponse.json(
        { error: 'You cannot flag your own review' },
        { status: 400 }
      );
    }

    // Check if user already flagged this review
    const existingFlag = await prisma.reviewFlag.findFirst({
      where: {
        reviewId,
        userId: user.id,
      },
    });

    if (existingFlag) {
      return NextResponse.json(
        { error: 'You have already flagged this review' },
        { status: 409 }
      );
    }

    // Create the flag
    await prisma.reviewFlag.create({
      data: {
        reviewId,
        userId: user.id,
        reason,
        details: details || null,
      },
    });

    // Update flag count on review
    const newFlagCount = review.flagCount + 1;

    // Auto-flag review if it reaches threshold (e.g., 3 flags)
    const FLAG_THRESHOLD = 3;
    const shouldAutoFlag = newFlagCount >= FLAG_THRESHOLD && review.status === 'APPROVED';

    await prisma.review.update({
      where: { id: reviewId },
      data: {
        flagCount: newFlagCount,
        ...(shouldAutoFlag && {
          status: 'FLAGGED',
          flagReason: `Auto-flagged: Received ${newFlagCount} user reports`,
        }),
      },
    });

    return NextResponse.json({
      message: 'Review flagged for moderation. Thank you for helping keep our community safe.',
      autoFlagged: shouldAutoFlag,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error flagging review:', error);
    return NextResponse.json({ error: 'Failed to flag review' }, { status: 500 });
  }
}
