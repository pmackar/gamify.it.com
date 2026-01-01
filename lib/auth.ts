import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/db';
import type { User } from '@supabase/supabase-js';

// Helper to get Supabase user from session
export async function getSupabaseUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Get or create profile for a user
export async function getProfile(supabaseUser: User) {
  // Use upsert to avoid race conditions
  const profile = await prisma.profiles.upsert({
    where: { id: supabaseUser.id },
    update: {
      // Update avatar if changed
      avatar_url: supabaseUser.user_metadata?.avatar_url,
    },
    create: {
      id: supabaseUser.id,
      email: supabaseUser.email!,
      display_name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0],
      avatar_url: supabaseUser.user_metadata?.avatar_url,
    },
    include: {
      app_profiles: true,
    },
  });

  return profile;
}

// Get or create travel app profile
export async function getTravelProfile(userId: string) {
  // Use upsert to avoid race conditions
  const appProfile = await prisma.app_profiles.upsert({
    where: {
      user_id_app_id: {
        user_id: userId,
        app_id: 'travel',
      },
    },
    update: {},
    create: {
      user_id: userId,
      app_id: 'travel',
      xp: 0,
      level: 1,
      xp_to_next: 100,
      stats: {},
    },
  });

  return appProfile;
}

// Combined helper to get user with profile
export async function getUser() {
  const supabaseUser = await getSupabaseUser();
  if (!supabaseUser) return null;

  try {
    const profile = await getProfile(supabaseUser);
    const travelProfile = await getTravelProfile(supabaseUser.id);

    return {
      id: profile.id,
      email: profile.email,
      name: profile.display_name,
      image: profile.avatar_url,
      // Global stats
      totalXP: profile.total_xp || 0,
      mainLevel: profile.main_level || 1,
      currentStreak: profile.current_streak || 0,
      longestStreak: profile.longest_streak || 0,
      // Travel-specific stats
      travel: {
        xp: travelProfile.xp || 0,
        level: travelProfile.level || 1,
        xpToNext: travelProfile.xp_to_next || 100,
        stats: travelProfile.stats || {},
      },
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    // Return basic info from Supabase if DB fails
    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0],
      image: supabaseUser.user_metadata?.avatar_url,
      totalXP: 0,
      mainLevel: 1,
      currentStreak: 0,
      longestStreak: 0,
      travel: {
        xp: 0,
        level: 1,
        xpToNext: 100,
        stats: {},
      },
    };
  }
}

export async function requireAuth() {
  const user = await getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}
