import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/db';

// GET - Fetch user's synced fitness state
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await prisma.gamify_fitness_data.findUnique({
    where: { user_id: user.id },
  });

  if (!data) {
    return NextResponse.json(null);
  }

  return NextResponse.json({
    data: data.data,
    updated_at: data.updated_at?.toISOString() || null,
  });
}

// POST - Save user's fitness state
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { data } = body;

    if (!data) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const now = new Date();

    // Upsert the data
    await prisma.gamify_fitness_data.upsert({
      where: { user_id: user.id },
      update: {
        data: data,
        updated_at: now,
      },
      create: {
        user_id: user.id,
        data: data,
        updated_at: now,
      },
    });

    return NextResponse.json({
      success: true,
      updated_at: now.toISOString(),
    });
  } catch (error) {
    console.error('Fitness sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
