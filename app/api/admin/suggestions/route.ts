import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { EditSuggestionStatus } from '@prisma/client';

// GET /api/admin/suggestions - Get all edit suggestions for moderation
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as EditSuggestionStatus | null;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Parameters<typeof prisma.locationEditSuggestion.findMany>[0]['where'] = {};

    if (status) {
      where.status = status;
    } else {
      // Default: show pending suggestions
      where.status = 'PENDING';
    }

    const [suggestions, total] = await Promise.all([
      prisma.locationEditSuggestion.findMany({
        where,
        include: {
          location: {
            select: {
              id: true,
              name: true,
              city: true,
              neighborhood: true,
            },
          },
          suggestedBy: {
            select: {
              id: true,
              username: true,
              email: true,
              avatarUrl: true,
            },
          },
          moderatedBy: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.locationEditSuggestion.count({ where }),
    ]);

    return NextResponse.json({
      data: suggestions,
      total,
      limit,
      offset,
      hasMore: offset + suggestions.length < total,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching suggestions:', error);
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}
