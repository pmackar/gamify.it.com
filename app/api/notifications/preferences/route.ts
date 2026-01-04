import { NextResponse } from 'next/server';
import { getSupabaseUser } from '@/lib/auth';
import prisma from '@/lib/db';

/**
 * GET /api/notifications/preferences
 *
 * Get user's notification preferences
 */
export async function GET() {
  try {
    const user = await getSupabaseUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let prefs = await prisma.notification_preferences.findUnique({
      where: { user_id: user.id },
    });

    if (!prefs) {
      // Create default preferences
      prefs = await prisma.notification_preferences.create({
        data: {
          user_id: user.id,
        },
      });
    }

    return NextResponse.json({
      preferences: {
        pushEnabled: prefs.push_enabled,
        streakReminder6pm: prefs.streak_reminder_6pm,
        streakDanger9pm: prefs.streak_danger_9pm,
        achievementUnlock: prefs.achievement_unlock,
        leagueUpdates: prefs.league_updates,
        dailySummary: prefs.daily_summary,
        friendActivity: prefs.friend_activity,
        emailEnabled: prefs.email_enabled,
        emailWeeklyDigest: prefs.email_weekly_digest,
        emailStreakDanger: prefs.email_streak_danger,
        emailPromotions: prefs.email_promotions,
        quietStart: prefs.quiet_start,
        quietEnd: prefs.quiet_end,
        timezone: prefs.timezone,
      },
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/notifications/preferences
 *
 * Update notification preferences
 */
export async function PUT(request: Request) {
  try {
    const user = await getSupabaseUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Build update data, only including provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };

    const fieldMappings: Record<string, string> = {
      pushEnabled: 'push_enabled',
      streakReminder6pm: 'streak_reminder_6pm',
      streakDanger9pm: 'streak_danger_9pm',
      achievementUnlock: 'achievement_unlock',
      leagueUpdates: 'league_updates',
      dailySummary: 'daily_summary',
      friendActivity: 'friend_activity',
      emailEnabled: 'email_enabled',
      emailWeeklyDigest: 'email_weekly_digest',
      emailStreakDanger: 'email_streak_danger',
      emailPromotions: 'email_promotions',
      quietStart: 'quiet_start',
      quietEnd: 'quiet_end',
      timezone: 'timezone',
    };

    for (const [clientKey, dbKey] of Object.entries(fieldMappings)) {
      if (body[clientKey] !== undefined) {
        updateData[dbKey] = body[clientKey];
      }
    }

    const prefs = await prisma.notification_preferences.upsert({
      where: { user_id: user.id },
      update: updateData,
      create: {
        user_id: user.id,
        ...updateData,
      },
    });

    return NextResponse.json({
      success: true,
      preferences: {
        pushEnabled: prefs.push_enabled,
        streakReminder6pm: prefs.streak_reminder_6pm,
        streakDanger9pm: prefs.streak_danger_9pm,
        achievementUnlock: prefs.achievement_unlock,
        leagueUpdates: prefs.league_updates,
        dailySummary: prefs.daily_summary,
        friendActivity: prefs.friend_activity,
        emailEnabled: prefs.email_enabled,
        emailWeeklyDigest: prefs.email_weekly_digest,
        emailStreakDanger: prefs.email_streak_danger,
        emailPromotions: prefs.email_promotions,
        quietStart: prefs.quiet_start,
        quietEnd: prefs.quiet_end,
        timezone: prefs.timezone,
      },
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
