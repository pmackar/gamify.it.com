import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { sendPushNotification, NotificationTemplates } from '@/lib/notifications/web-push';

// Verify cron secret to prevent unauthorized calls
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/cron/streak-danger-9pm
 *
 * Send urgent streak danger notification to users who still haven't been active
 * Called by Vercel Cron at 9pm in each timezone
 */
export async function GET(request: Request) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find users with:
    // 1. Active streak > 0 (more urgent if higher)
    // 2. Haven't logged activity today
    // 3. Have push notifications enabled for streak danger
    const usersToNotify = await prisma.profiles.findMany({
      where: {
        current_streak: { gt: 0 },
        last_activity_date: { lt: today },
      },
      select: {
        id: true,
        current_streak: true,
        streak_shields: true,
      },
    });

    console.log(`[Cron] Found ${usersToNotify.length} users for 9pm danger alert`);

    let sent = 0;
    let skipped = 0;
    let hasShield = 0;

    for (const user of usersToNotify) {
      // Check preferences
      const prefs = await prisma.notification_preferences.findUnique({
        where: { user_id: user.id },
      });

      if (!prefs?.streak_danger_9pm || !prefs.push_enabled) {
        skipped++;
        continue;
      }

      // If user has a streak shield, modify the message
      const streak = user.current_streak || 0;

      if ((user.streak_shields || 0) > 0) {
        hasShield++;
        // Still notify but with modified message
        const result = await sendPushNotification({
          userId: user.id,
          type: 'streak_reminder',
          payload: {
            title: 'Streak Shield Ready',
            body: `Your ${streak}-day streak is protected, but why not keep the momentum going?`,
            icon: '/icon-192.png',
            tag: 'streak-shield',
            data: { type: 'streak_reminder' },
          },
        });

        if (result.success) sent++;
      } else {
        // Urgent notification
        const result = await sendPushNotification({
          userId: user.id,
          type: 'streak_danger',
          payload: NotificationTemplates.streakDanger9pm(streak),
        });

        if (result.success) sent++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${sent} danger alerts, skipped ${skipped}, with shields ${hasShield}`,
      stats: {
        total: usersToNotify.length,
        sent,
        skipped,
        hasShield,
      },
    });
  } catch (error) {
    console.error('Streak danger cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
