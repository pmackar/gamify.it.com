'use server';

import { revalidatePath } from 'next/cache';
import { getUser } from '@/lib/auth';
import prisma from '@/lib/db';

async function requireAuth() {
  const user = await getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

// Toggle hotlist status for a location
export async function toggleHotlist(locationId: string) {
  const user = await requireAuth();

  const existing = await prisma.travel_user_location_data.findUnique({
    where: {
      user_id_location_id: {
        user_id: user.id,
        location_id: locationId,
      },
    },
  });

  if (existing) {
    await prisma.travel_user_location_data.update({
      where: { id: existing.id },
      data: { hotlist: !existing.hotlist },
    });
  } else {
    await prisma.travel_user_location_data.create({
      data: {
        user_id: user.id,
        location_id: locationId,
        hotlist: true,
      },
    });
  }

  revalidatePath(`/travel/locations/${locationId}`);
  revalidatePath('/travel/locations');
  revalidatePath('/travel/map');
  return { success: true };
}

// Mark a location as visited
export async function markAsVisited(locationId: string) {
  const user = await requireAuth();

  const location = await prisma.travel_locations.findUnique({
    where: { id: locationId },
    select: { id: true, type: true },
  });

  if (!location) {
    throw new Error('Location not found');
  }

  const existing = await prisma.travel_user_location_data.findUnique({
    where: {
      user_id_location_id: {
        user_id: user.id,
        location_id: locationId,
      },
    },
  });

  const now = new Date();
  const wasVisited = existing?.visited ?? false;
  const isFirstVisit = !wasVisited;

  if (existing) {
    await prisma.travel_user_location_data.update({
      where: { id: existing.id },
      data: {
        visited: true,
        last_visited_at: now,
        first_visited_at: existing.first_visited_at || now,
        visit_count: { increment: 1 },
      },
    });
  } else {
    await prisma.travel_user_location_data.create({
      data: {
        user_id: user.id,
        location_id: locationId,
        visited: true,
        first_visited_at: now,
        last_visited_at: now,
        visit_count: 1,
      },
    });
  }

  // Update location aggregate
  await prisma.travel_locations.update({
    where: { id: locationId },
    data: { total_visits: { increment: 1 } },
  });

  // Award XP for first visit via unified API
  let xpGained = 0;
  if (isFirstVisit) {
    try {
      // Call the unified XP API internally
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/xp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: 'travel',
          action: 'location_visit',
          xpAmount: 50, // Base XP for first visit
          metadata: {
            locationType: location.type,
            locationId,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        xpGained = data.xpAwarded || 50;
      }
    } catch {
      // Silently fail - visit is still recorded
      xpGained = 50;
    }
  }

  revalidatePath(`/travel/locations/${locationId}`);
  revalidatePath('/travel/locations');
  revalidatePath('/travel/profile');
  revalidatePath('/travel/map');

  return { success: true, xpGained, isFirstVisit };
}

// Unmark a location as visited (undo)
export async function unmarkAsVisited(locationId: string) {
  const user = await requireAuth();

  const existing = await prisma.travel_user_location_data.findUnique({
    where: {
      user_id_location_id: {
        user_id: user.id,
        location_id: locationId,
      },
    },
  });

  if (existing && existing.visited) {
    await prisma.$transaction([
      prisma.travel_user_location_data.update({
        where: { id: existing.id },
        data: { visited: false },
      }),
      prisma.travel_locations.update({
        where: { id: locationId },
        data: { total_visits: { decrement: 1 } },
      }),
    ]);
  }

  revalidatePath(`/travel/locations/${locationId}`);
  revalidatePath('/travel/locations');
  revalidatePath('/travel/profile');
  revalidatePath('/travel/map');

  return { success: true };
}

// Rate a location (1-10)
export async function rateLocation(locationId: string, rating: number) {
  const user = await requireAuth();

  if (rating < 1 || rating > 10) {
    throw new Error('Rating must be between 1 and 10');
  }

  const existing = await prisma.travel_user_location_data.findUnique({
    where: {
      user_id_location_id: {
        user_id: user.id,
        location_id: locationId,
      },
    },
  });

  if (existing) {
    await prisma.travel_user_location_data.update({
      where: { id: existing.id },
      data: { personal_rating: rating },
    });
  } else {
    await prisma.travel_user_location_data.create({
      data: {
        user_id: user.id,
        location_id: locationId,
        personal_rating: rating,
      },
    });
  }

  // Recalculate average rating for the location
  const allRatings = await prisma.travel_user_location_data.findMany({
    where: {
      location_id: locationId,
      personal_rating: { not: null },
    },
    select: { personal_rating: true },
  });

  const ratingCount = allRatings.length;
  const avgRating =
    ratingCount > 0
      ? allRatings.reduce((sum, r) => sum + (r.personal_rating || 0), 0) / ratingCount
      : null;

  await prisma.travel_locations.update({
    where: { id: locationId },
    data: {
      avg_rating: avgRating,
      rating_count: ratingCount,
    },
  });

  revalidatePath(`/travel/locations/${locationId}`);
  revalidatePath('/travel/locations');

  return { success: true, avgRating };
}

// Remove rating from a location
export async function removeRating(locationId: string) {
  const user = await requireAuth();

  const existing = await prisma.travel_user_location_data.findUnique({
    where: {
      user_id_location_id: {
        user_id: user.id,
        location_id: locationId,
      },
    },
  });

  if (existing && existing.personal_rating !== null) {
    await prisma.travel_user_location_data.update({
      where: { id: existing.id },
      data: { personal_rating: null },
    });

    // Recalculate average rating
    const allRatings = await prisma.travel_user_location_data.findMany({
      where: {
        location_id: locationId,
        personal_rating: { not: null },
      },
      select: { personal_rating: true },
    });

    const ratingCount = allRatings.length;
    const avgRating =
      ratingCount > 0
        ? allRatings.reduce((sum, r) => sum + (r.personal_rating || 0), 0) / ratingCount
        : null;

    await prisma.travel_locations.update({
      where: { id: locationId },
      data: {
        avg_rating: avgRating,
        rating_count: ratingCount,
      },
    });
  }

  revalidatePath(`/travel/locations/${locationId}`);
  return { success: true };
}

// Update personal notes for a location
export async function updateNotes(locationId: string, notes: string) {
  const user = await requireAuth();

  await prisma.travel_user_location_data.upsert({
    where: {
      user_id_location_id: {
        user_id: user.id,
        location_id: locationId,
      },
    },
    update: { notes },
    create: {
      user_id: user.id,
      location_id: locationId,
      notes,
    },
  });

  revalidatePath(`/travel/locations/${locationId}`);
  return { success: true };
}
