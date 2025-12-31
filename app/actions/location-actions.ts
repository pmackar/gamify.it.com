'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { addXP, updateStreak, updateUserStats, calculateLocationXP } from '@/lib/gamification';
import { checkAchievements } from '@/lib/achievements';

async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  return session.user;
}

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
  revalidatePath('/locations');
  revalidatePath('/map');
  return { success: true };
}

// Mark a location as visited
export async function markAsVisited(locationId: string) {
  const user = await requireAuth();

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { id: true, type: true },
  });

  if (!location) {
    throw new Error('Location not found');
  }

  const existing = await prisma.userLocationData.findUnique({
    where: {
      userId_locationId: {
        userId: user.id,
        locationId,
      },
    },
  });

  const now = new Date();
  const wasVisited = existing?.visited ?? false;
  const isFirstVisit = !wasVisited;

  if (existing) {
    await prisma.userLocationData.update({
      where: { id: existing.id },
      data: {
        visited: true,
        lastVisitedAt: now,
        firstVisitedAt: existing.firstVisitedAt || now,
        visitCount: { increment: 1 },
      },
    });
  } else {
    await prisma.userLocationData.create({
      data: {
        userId: user.id,
        locationId,
        visited: true,
        firstVisitedAt: now,
        lastVisitedAt: now,
        visitCount: 1,
      },
    });
  }

  // Update location aggregate
  await prisma.location.update({
    where: { id: locationId },
    data: { totalVisits: { increment: 1 } },
  });

  // Award XP for first visit
  let xpGained = 0;
  let leveledUp = false;
  let newLevel = 0;
  let newAchievements: unknown[] = [];

  if (isFirstVisit) {
    const streak = await updateStreak(user.id);
    xpGained = calculateLocationXP('first_visit', location.type, streak);
    const xpResult = await addXP(user.id, xpGained);
    leveledUp = xpResult.leveledUp;
    newLevel = xpResult.newLevel;
    await updateUserStats(user.id);
    newAchievements = await checkAchievements(user.id);
  }

  revalidatePath(`/locations/${locationId}`);
  revalidatePath('/locations');
  revalidatePath('/profile');
  revalidatePath('/map');

  return { success: true, xpGained, leveledUp, newLevel, newAchievements };
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
        data: { totalVisits: { decrement: 1 } },
      }),
    ]);
  }

  revalidatePath(`/locations/${locationId}`);
  revalidatePath('/locations');
  revalidatePath('/profile');
  revalidatePath('/map');

  return { success: true };
}

// Rate a location (1-10)
export async function rateLocation(locationId: string, rating: number) {
  const user = await requireAuth();

  if (rating < 1 || rating > 10) {
    throw new Error('Rating must be between 1 and 10');
  }

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
      data: { personalRating: rating },
    });
  } else {
    await prisma.userLocationData.create({
      data: {
        userId: user.id,
        locationId,
        personalRating: rating,
      },
    });
  }

  // Recalculate average rating for the location
  const allRatings = await prisma.userLocationData.findMany({
    where: {
      locationId,
      personalRating: { not: null },
    },
    select: { personalRating: true },
  });

  const ratingCount = allRatings.length;
  const avgRating =
    ratingCount > 0
      ? allRatings.reduce((sum, r) => sum + (r.personalRating || 0), 0) / ratingCount
      : null;

  await prisma.location.update({
    where: { id: locationId },
    data: {
      avgRating,
      ratingCount,
    },
  });

  revalidatePath(`/locations/${locationId}`);
  revalidatePath('/locations');

  return { success: true, avgRating };
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

  if (existing && existing.personalRating !== null) {
    await prisma.userLocationData.update({
      where: { id: existing.id },
      data: { personalRating: null },
    });

    // Recalculate average rating
    const allRatings = await prisma.userLocationData.findMany({
      where: {
        locationId,
        personalRating: { not: null },
      },
      select: { personalRating: true },
    });

    const ratingCount = allRatings.length;
    const avgRating =
      ratingCount > 0
        ? allRatings.reduce((sum, r) => sum + (r.personalRating || 0), 0) / ratingCount
        : null;

    await prisma.location.update({
      where: { id: locationId },
      data: {
        avgRating,
        ratingCount,
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
