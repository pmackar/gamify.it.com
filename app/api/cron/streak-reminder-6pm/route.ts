import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { sendPushNotification, NotificationTemplates } from '@/lib/notifications/web-push';

// Verify cron secret to prevent unauthorized calls
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/cron/streak-reminder-6pm
 *
 * Send streak reminder to users who haven't been active today
 * Called by Vercel Cron at 6pm in each timezone
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
    // 1. Active streak > 0
    // 2. Haven't logged activity today
    // 3. Have push notifications enabled for streak reminders
    const usersToNotify = await prisma.profiles.findMany({
      where: {
        current_streak: { gt: 0 },
        last_activity_date: { lt: today },
      },
      select: {
        id: true,
        current_streak: true,
      },
    });

    console.log(`[Cron] Found ${usersToNotify.length} users for 6pm reminder`);

    let sent = 0;
    let skipped = 0;

    for (const user of usersToNotify) {
      // Check preferences
      const prefs = await prisma.notification_preferences.findUnique({
        where: { user_id: user.id },
      });

      if (!prefs?.streak_reminder_6pm || !prefs.push_enabled) {
        skipped++;
        continue;
      }

      const result = await sendPushNotification({
        userId: user.id,
        type: 'streak_reminder',
        payload: NotificationTemplates.streakReminder6pm(user.current_streak || 0),
      });

      if (result.success) {
        sent++;
      } else {
        console.log(`[Cron] Failed to send to ${user.id}: ${result.error}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${sent} reminders, skipped ${skipped}`,
      stats: {
        total: usersToNotify.length,
        sent,
        skipped,
      },
    });
  } catch (error) {
    console.error('Streak reminder cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
