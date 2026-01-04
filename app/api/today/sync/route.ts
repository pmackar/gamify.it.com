import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { withAuth, validateBody, Errors } from '@/lib/api';

// Schema for today sync data - accepts any JSON object
const syncSchema = z.object({
  data: z.record(z.string(), z.unknown()),
});

// GET - Fetch user's synced state
export const GET = withAuth(async (_request, user) => {
  const data = await prisma.gamify_today_data.findUnique({
    where: { user_id: user.id },
  });

  if (!data) {
    return NextResponse.json(null);
  }

  return NextResponse.json({
    data: data.data,
    updated_at: data.updated_at?.toISOString() || null,
  });
});

// POST - Save user's state
export const POST = withAuth(async (request, user) => {
  const body = await validateBody(request, syncSchema);
  if (body instanceof NextResponse) return body;

  const now = new Date();

  try {
    const jsonData = body.data as Prisma.InputJsonValue;

    await prisma.gamify_today_data.upsert({
      where: { user_id: user.id },
      update: {
        data: jsonData,
        updated_at: now,
      },
      create: {
        user_id: user.id,
        data: jsonData,
        updated_at: now,
      },
    });

    return NextResponse.json({
      success: true,
      updated_at: now.toISOString(),
    });
  } catch (error) {
    console.error('Today sync error:', error);
    return Errors.database('Failed to sync today data');
  }
});
