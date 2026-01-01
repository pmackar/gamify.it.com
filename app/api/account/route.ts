import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch main profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Fetch app profiles
  const { data: appProfiles } = await supabase
    .from('app_profiles')
    .select('*')
    .eq('user_id', user.id);

  // Fetch user achievements
  const { data: userAchievements } = await supabase
    .from('user_achievements')
    .select(`
      *,
      achievement:achievements(*)
    `)
    .eq('user_id', user.id)
    .eq('is_completed', true);

  // Calculate XP needed for next main level
  const xpForLevel = (level: number) => {
    let total = 0;
    let needed = 100;
    for (let i = 1; i < level; i++) {
      total += needed;
      needed = Math.floor(needed * 1.5);
    }
    return { total, needed };
  };

  const mainLevel = profile?.main_level || 1;
  const totalXP = profile?.total_xp || 0;
  const { total: xpAtCurrentLevel, needed: xpToNext } = xpForLevel(mainLevel);
  const currentLevelXP = totalXP - xpAtCurrentLevel;

  // Build app data with icons and colors
  const appData = [
    {
      id: 'fitness',
      name: 'Iron Quest',
      icon: '💪',
      color: '#FF6B6B',
      url: 'https://fitness.gamify.it.com',
      profile: appProfiles?.find(p => p.app_id === 'fitness'),
    },
    {
      id: 'travel',
      name: 'Explorer',
      icon: '✈️',
      color: '#5CC9F5',
      url: '/travel',
      profile: appProfiles?.find(p => p.app_id === 'travel'),
    },
    {
      id: 'today',
      name: 'Day Quest',
      icon: '✅',
      color: '#7FD954',
      url: 'https://today.gamify.it.com',
      profile: appProfiles?.find(p => p.app_id === 'today'),
    },
  ];

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: profile?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0],
      avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url,
      username: profile?.username,
      bio: profile?.bio,
    },
    mainStats: {
      level: mainLevel,
      totalXP,
      currentLevelXP,
      xpToNext,
      currentStreak: profile?.current_streak || 0,
      longestStreak: profile?.longest_streak || 0,
    },
    apps: appData,
    achievements: {
      total: userAchievements?.length || 0,
      list: userAchievements?.map(ua => ({
        id: ua.id,
        code: ua.achievement?.code,
        name: ua.achievement?.name,
        description: ua.achievement?.description,
        icon: ua.achievement?.icon,
        appId: ua.achievement?.app_id,
        completedAt: ua.completed_at,
        xpReward: ua.achievement?.xp_reward,
        tier: ua.achievement?.tier || 1,
        category: ua.achievement?.category || 'general',
      })) || [],
    },
    memberSince: profile?.created_at || user.created_at,
  });
}
