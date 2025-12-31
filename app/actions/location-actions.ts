'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// Toggle hotlist status for a location
export async function toggleHotlist(locationId: string) {
  const user = await requireAuth();

  const existing = await prisma.userLocationData.findUnique({
    where: {
      userId_locationId: {
        userId: user.id,
        locationId,
      },
    },
  });

  if (existing) {
    await prisma.userLocationData.update({
      where: { id: existing.id },
      data: { hotlist: !existing.hotlist },
    });
  } else {
    await prisma.userLocationData.create({
      data: {
        userId: user.id,
        locationId,
        hotlist: true,
      },
    });
  }

  revalidatePath(`/locations/${locationId}`);
  revalidatePath('/explore');
  return { success: true };
}

// Mark a location as visited
export async function markAsVisited(locationId: string) {
  const user = await requireAuth();

  const existing = await prisma.userLocationData.findUnique({
    where: {
      userId_locationId: {
        userId: user.id,
        locationId,
      },
    },
  });

  const now = new Date();

  if (existing) {
    // Only increment if not already visited today
    const lastVisit = existing.lastVisitedAt;
    const isNewVisit = !lastVisit || lastVisit.toDateString() !== now.toDateString();

    await prisma.userLocationData.update({
      where: { id: existing.id },
      data: {
        visited: true,
        lastVisitedAt: now,
        firstVisitedAt: existing.firstVisitedAt || now,
        visitCount: isNewVisit ? { increment: 1 } : existing.visitCount,
      },
    });

    // Update location aggregate only for new visits
    if (isNewVisit) {
      await prisma.location.update({
        where: { id: locationId },
        data: { totalVisits: { increment: 1 } },
      });
    }
  } else {
    await prisma.$transaction([
      prisma.userLocationData.create({
        data: {
          userId: user.id,
          locationId,
          visited: true,
          firstVisitedAt: now,
          lastVisitedAt: now,
          visitCount: 1,
        },
      }),
      prisma.location.update({
        where: { id: locationId },
        data: { totalVisits: { increment: 1 } },
      }),
    ]);
  }

  revalidatePath(`/locations/${locationId}`);
  revalidatePath('/explore');
  revalidatePath('/profile');
  return { success: true };
}

// Unmark a location as visited (undo)
export async function unmarkAsVisited(locationId: string) {
  const user = await requireAuth();

  const existing = await prisma.userLocationData.findUnique({
    where: {
      userId_locationId: {
        userId: user.id,
        locationId,
      },
    },
  });

  if (existing && existing.visited) {
    await prisma.$transaction([
      prisma.userLocationData.update({
        where: { id: existing.id },
        data: { visited: false },
      }),
      prisma.location.update({
        where: { id: locationId },
        data: { totalVisits: { decrement: Math.min(existing.visitCount, 1) } },
      }),
    ]);
  }

  revalidatePath(`/locations/${locationId}`);
  revalidatePath('/explore');
  revalidatePath('/profile');
  return { success: true };
}

// Rate a location (1-5)
export async function rateLocation(locationId: string, rating: number) {
  const user = await requireAuth();

  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  const existing = await prisma.userLocationData.findUnique({
    where: {
      userId_locationId: {
        userId: user.id,
        locationId,
      },
    },
  });

  const hadPreviousRating = existing?.rating !== null && existing?.rating !== undefined;

  if (existing) {
    await prisma.userLocationData.update({
      where: { id: existing.id },
      data: { rating },
    });
  } else {
    await prisma.userLocationData.create({
      data: {
        userId: user.id,
        locationId,
        rating,
      },
    });
  }

  // Recalculate average rating for the location
  const allRatings = await prisma.userLocationData.findMany({
    where: {
      locationId,
      rating: { not: null },
    },
    select: { rating: true },
  });

  const totalRatings = allRatings.length;
  const averageRating =
    totalRatings > 0
      ? allRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / totalRatings
      : null;

  await prisma.location.update({
    where: { id: locationId },
    data: {
      averageRating,
      totalRatings,
    },
  });

  revalidatePath(`/locations/${locationId}`);
  revalidatePath('/explore');
  return { success: true, averageRating };
}

// Remove rating from a location
export async function removeRating(locationId: string) {
  const user = await requireAuth();

  const existing = await prisma.userLocationData.findUnique({
    where: {
      userId_locationId: {
        userId: user.id,
        locationId,
      },
    },
  });

  if (existing && existing.rating !== null) {
    await prisma.userLocationData.update({
      where: { id: existing.id },
      data: { rating: null },
    });

    // Recalculate average rating
    const allRatings = await prisma.userLocationData.findMany({
      where: {
        locationId,
        rating: { not: null },
      },
      select: { rating: true },
    });

    const totalRatings = allRatings.length;
    const averageRating =
      totalRatings > 0
        ? allRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / totalRatings
        : null;

    await prisma.location.update({
      where: { id: locationId },
      data: {
        averageRating,
        totalRatings,
      },
    });
  }

  revalidatePath(`/locations/${locationId}`);
  return { success: true };
}

// Update personal notes for a location
export async function updateNotes(locationId: string, notes: string) {
  const user = await requireAuth();

  await prisma.userLocationData.upsert({
    where: {
      userId_locationId: {
        userId: user.id,
        locationId,
      },
    },
    update: { notes },
    create: {
      userId: user.id,
      locationId,
      notes,
    },
  });

  revalidatePath(`/locations/${locationId}`);
  return { success: true };
}
