import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, getCurrentUser } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Fields that can be edited through suggestions (require moderation)
const EDITABLE_FIELDS = ['neighborhood', 'hours', 'city', 'name', 'address', 'description', 'website', 'phone'];

// GET /api/locations/[id]/suggestions - Get suggestions for a location
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: locationId } = await params;
    const user = await getCurrentUser();

    // Verify location exists
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true },
    });

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    // Get pending suggestions (optionally filter by user)
    const where: Parameters<typeof prisma.locationEditSuggestion.findMany>[0]['where'] = {
      locationId,
      status: 'PENDING',
    };

    // Non-authenticated users can see pending suggestions count only
    // Authenticated users can see their own suggestions
    if (user) {
      const mySuggestions = await prisma.locationEditSuggestion.findMany({
        where: {
          locationId,
          suggestedById: user.id,
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          field: true,
          oldValue: true,
          newValue: true,
          status: true,
          createdAt: true,
          moderationNotes: true,
        },
      });

      const pendingCount = await prisma.locationEditSuggestion.count({ where });

      return NextResponse.json({
        mySuggestions,
        pendingCount,
      });
    }

    const pendingCount = await prisma.locationEditSuggestion.count({ where });
    return NextResponse.json({ pendingCount });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}

// POST /api/locations/[id]/suggestions - Suggest an edit to a location field
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id: locationId } = await params;
    const body = await request.json();

    const { field, newValue } = body;

    // Validate field
    if (!field || !EDITABLE_FIELDS.includes(field)) {
      return NextResponse.json(
        { error: `Invalid field. Allowed fields: ${EDITABLE_FIELDS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate newValue
    if (newValue === undefined || newValue === null) {
      return NextResponse.json({ error: 'New value is required' }, { status: 400 });
    }

    // Get current location with the field value
    const location = await prisma.location.findUnique({
      where: { id: locationId, isActive: true },
    });

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    // Get current value of the field
    const oldValue = (location as Record<string, unknown>)[field] as string | null;

    // Don't create suggestion if value is the same
    if (oldValue === newValue) {
      return NextResponse.json(
        { error: 'New value is the same as current value' },
        { status: 400 }
      );
    }

    // Check if user already has a pending suggestion for this field
    const existingSuggestion = await prisma.locationEditSuggestion.findFirst({
      where: {
        locationId,
        suggestedById: user.id,
        field,
        status: 'PENDING',
      },
    });

    if (existingSuggestion) {
      // Update existing suggestion
      const updated = await prisma.locationEditSuggestion.update({
        where: { id: existingSuggestion.id },
        data: {
          oldValue: oldValue || null,
          newValue: String(newValue),
        },
      });

      return NextResponse.json({
        data: updated,
        message: 'Suggestion updated',
      });
    }

    // Create new suggestion
    const suggestion = await prisma.locationEditSuggestion.create({
      data: {
        locationId,
        suggestedById: user.id,
        field,
        oldValue: oldValue || null,
        newValue: String(newValue),
        status: 'PENDING',
      },
    });

    return NextResponse.json(
      {
        data: suggestion,
        message: 'Suggestion submitted for review',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error creating suggestion:', error);
    return NextResponse.json({ error: 'Failed to submit suggestion' }, { status: 500 });
  }
}
