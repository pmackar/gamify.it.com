import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, requireAuth } from '@/lib/auth';
import { checkForSpam } from '@/lib/moderation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/locations/[id]/reviews - Get reviews for a location
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: locationId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sort') || 'recent'; // recent, helpful, rating

    // Verify location exists
    const location = await prisma.location.findUnique({
      where: { id: locationId, isActive: true },
      select: { id: true },
    });

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    // Build order by clause
    let orderBy: Parameters<typeof prisma.review.findMany>[0]['orderBy'];
    switch (sortBy) {
      case 'helpful':
        orderBy = { helpfulCount: 'desc' };
        break;
      case 'rating':
        orderBy = { rating: 'desc' };
        break;
      case 'recent':
      default:
        orderBy = { createdAt: 'desc' };
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: {
          locationId,
          status: 'APPROVED',
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
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.review.count({
        where: {
          locationId,
          status: 'APPROVED',
        },
      }),
    ]);

    // Check if current user has reviewed this location
    const user = await getCurrentUser();
    let userReview = null;

    if (user) {
      userReview = await prisma.review.findFirst({
        where: {
          locationId,
          authorId: user.id,
        },
        select: {
          id: true,
          status: true,
        },
      });
    }

    return NextResponse.json({
      data: reviews,
      total,
      limit,
      offset,
      hasMore: offset + reviews.length < total,
      userHasReviewed: !!userReview,
      userReviewStatus: userReview?.status || null,
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

// POST /api/locations/[id]/reviews - Create a review
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id: locationId } = await params;
    const body = await request.json();

    const { title, content, rating } = body;

    // Validate required fields
    if (!content || !rating) {
      return NextResponse.json(
        { error: 'Content and rating are required' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Verify location exists
    const location = await prisma.location.findUnique({
      where: { id: locationId, isActive: true },
      select: { id: true },
    });

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    // Check if user already has a review (only one per location)
    const existingReview = await prisma.review.findFirst({
      where: {
        locationId,
        authorId: user.id,
      },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this location. Edit your existing review instead.' },
        { status: 409 }
      );
    }

    // Check for spam/inappropriate content
    const spamCheck = checkForSpam(content, title);
    const initialStatus = spamCheck.isSpam ? 'FLAGGED' : 'APPROVED';

    // Create the review
    const review = await prisma.review.create({
      data: {
        locationId,
        authorId: user.id,
        title: title || null,
        content,
        rating,
        status: initialStatus,
        flagReason: spamCheck.isSpam ? spamCheck.reason : null,
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

    // Update location review count and recalculate average if approved
    if (initialStatus === 'APPROVED') {
      await updateLocationReviewStats(locationId);
    }

    return NextResponse.json(
      {
        data: review,
        message: spamCheck.isSpam
          ? 'Your review has been submitted for moderation.'
          : 'Review posted successfully!',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error creating review:', error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
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
