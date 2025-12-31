import { createClient } from '@/lib/supabase/server';
import type { Profile, AppProfile } from '@/lib/supabase/types';

// Get current authenticated user with profile
export async function getUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get profile from our profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}

// Require authentication - throws if not authenticated
export async function requireAuth(): Promise<Profile> {
  const profile = await getUser();

  if (!profile) {
    throw new Error('Unauthorized');
  }

  return profile;
}

// Get user's app-specific profile
export async function getAppProfile(
  userId: string,
  appId: 'fitness' | 'travel' | 'today'
): Promise<AppProfile | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('app_profiles')
    .select('*')
    .eq('user_id', userId)
    .eq('app_id', appId)
    .single();

  return data;
}

// Update or create app profile with XP
export async function updateAppXp(
  userId: string,
  appId: 'fitness' | 'travel' | 'today',
  xpToAdd: number
): Promise<AppProfile | null> {
  const supabase = await createClient();

  // First try to get existing profile
  const { data: existing } = await supabase
    .from('app_profiles')
    .select('*')
    .eq('user_id', userId)
    .eq('app_id', appId)
    .single();

  if (existing) {
    // Update existing
    const newXp = existing.xp + xpToAdd;
    const newLevel = calculateLevel(newXp);
    const newXpToNext = calculateXpToNext(newXp);

    const { data } = await supabase
      .from('app_profiles')
      .update({
        xp: newXp,
        level: newLevel,
        xp_to_next: newXpToNext,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    return data;
  } else {
    // Create new app profile
    const { data } = await supabase
      .from('app_profiles')
      .insert({
        user_id: userId,
        app_id: appId,
        xp: xpToAdd,
        level: calculateLevel(xpToAdd),
        xp_to_next: calculateXpToNext(xpToAdd),
      })
      .select()
      .single();

    return data;
  }
}

// Calculate level from XP (same formula as database)
function calculateLevel(totalXp: number): number {
  let level = 1;
  let xpRemaining = totalXp;
  let xpNeeded = 100;

  while (xpRemaining >= xpNeeded) {
    xpRemaining -= xpNeeded;
    level++;
    xpNeeded = Math.floor(xpNeeded * 1.5);
  }

  return level;
}

// Calculate XP needed to reach next level
function calculateXpToNext(totalXp: number): number {
  let xpRemaining = totalXp;
  let xpNeeded = 100;

  while (xpRemaining >= xpNeeded) {
    xpRemaining -= xpNeeded;
    xpNeeded = Math.floor(xpNeeded * 1.5);
  }

  return xpNeeded - xpRemaining;
}

// Sign out user
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

// Legacy export for compatibility during migration
export const authOptions = {};

// Alias for backwards compatibility
export const getCurrentUser = getUser;

// Admin check - for now, same as requireAuth (implement proper admin check later)
export const requireAdmin = requireAuth;
