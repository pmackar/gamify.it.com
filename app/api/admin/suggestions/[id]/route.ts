import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/suggestions/[id] - Get a single suggestion
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;

    const suggestion = await prisma.locationEditSuggestion.findUnique({
      where: { id },
      include: {
        location: true,
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
    });

    if (!suggestion) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
    }

    return NextResponse.json({ data: suggestion });
  } catch (error) {
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching suggestion:', error);
    return NextResponse.json({ error: 'Failed to fetch suggestion' }, { status: 500 });
  }
}

// PATCH /api/admin/suggestions/[id] - Approve or reject a suggestion
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const { action, notes } = body;

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be APPROVE or REJECT' },
        { status: 400 }
      );
    }

    // Get the suggestion
    const suggestion = await prisma.locationEditSuggestion.findUnique({
      where: { id },
      include: {
        location: true,
      },
    });

    if (!suggestion) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
    }

    if (suggestion.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Suggestion has already been processed' },
        { status: 400 }
      );
    }

    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    // If approving, apply the change to the location
    if (action === 'APPROVE') {
      // Build the update data dynamically
      const locationUpdate: Record<string, string | null> = {};
      locationUpdate[suggestion.field] = suggestion.newValue;

      await prisma.$transaction([
        // Update the location
        prisma.location.update({
          where: { id: suggestion.locationId },
          data: locationUpdate,
        }),
        // Update the suggestion status
        prisma.locationEditSuggestion.update({
          where: { id },
          data: {
            status: newStatus,
            moderatedById: admin.id,
            moderatedAt: new Date(),
            moderationNotes: notes || null,
          },
        }),
      ]);
    } else {
      // Just update the suggestion status
      await prisma.locationEditSuggestion.update({
        where: { id },
        data: {
          status: newStatus,
          moderatedById: admin.id,
          moderatedAt: new Date(),
          moderationNotes: notes || null,
        },
      });
    }

    const updated = await prisma.locationEditSuggestion.findUnique({
      where: { id },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            city: true,
            neighborhood: true,
            hours: true,
          },
        },
        suggestedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return NextResponse.json({
      data: updated,
      message: `Suggestion ${action.toLowerCase()}d successfully`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error processing suggestion:', error);
    return NextResponse.json({ error: 'Failed to process suggestion' }, { status: 500 });
  }
}
