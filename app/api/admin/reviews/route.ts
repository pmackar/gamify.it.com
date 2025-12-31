import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { ReviewStatus } from '@prisma/client';

// GET /api/admin/reviews - Get reviews for moderation
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as ReviewStatus | null;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Parameters<typeof prisma.review.findMany>[0]['where'] = {};

    if (status) {
      where.status = status;
    } else {
      // Default: show flagged and under review
      where.status = { in: ['FLAGGED', 'UNDER_REVIEW'] };
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              email: true,
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
          flags: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: [{ flagCount: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      prisma.review.count({ where }),
    ]);

    return NextResponse.json({
      data: reviews,
      total,
      limit,
      offset,
      hasMore: offset + reviews.length < total,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching reviews for moderation:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}
