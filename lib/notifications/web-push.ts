import prisma from '@/lib/db';

// Web Push library would be imported here in production
// import webpush from 'web-push';

// VAPID keys should be generated once and stored in environment variables
// To generate: npx web-push generate-vapid-keys
export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
export const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
export const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:hello@gamify.it.com';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    type?: string;
    url?: string;
    notificationId?: string;
    [key: string]: unknown;
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
}

export interface NotificationOptions {
  userId: string;
  type: string;
  payload: PushNotificationPayload;
  channel?: 'push' | 'email' | 'both';
}

/**
 * Send a push notification to a user
 */
export async function sendPushNotification(
  options: NotificationOptions
): Promise<{ success: boolean; error?: string }> {
  const { userId, type, payload, channel = 'push' } = options;

  try {
    // Check user preferences
    const prefs = await prisma.notification_preferences.findUnique({
      where: { user_id: userId },
    });

    if (prefs && !prefs.push_enabled) {
      return { success: false, error: 'Push notifications disabled' };
    }

    // Check quiet hours
    if (prefs && isQuietHours(prefs.quiet_start, prefs.quiet_end, prefs.timezone)) {
      return { success: false, error: 'Quiet hours active' };
    }

    // Get user's push subscriptions
    const subscriptions = await prisma.push_subscriptions.findMany({
      where: { user_id: userId },
    });

    if (subscriptions.length === 0) {
      return { success: false, error: 'No push subscriptions' };
    }

    // Log the notification
    const logEntry = await prisma.notification_log.create({
      data: {
        user_id: userId,
        type,
        channel: 'push',
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
      },
    });

    // Add notification ID to payload for tracking
    payload.data = {
      ...payload.data,
      notificationId: logEntry.id,
      type,
    };

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map((sub) => sendToSubscription(sub, payload))
    );

    // Clean up expired subscriptions
    const expiredIndexes = results
      .map((r, i) => (r.status === 'rejected' && isExpiredError(r.reason) ? i : -1))
      .filter((i) => i !== -1);

    if (expiredIndexes.length > 0) {
      const expiredIds = expiredIndexes.map((i) => subscriptions[i].id);
      await prisma.push_subscriptions.deleteMany({
        where: { id: { in: expiredIds } },
      });
    }

    const successCount = results.filter((r) => r.status === 'fulfilled').length;

    return {
      success: successCount > 0,
      error: successCount === 0 ? 'All subscriptions failed' : undefined,
    };
  } catch (error) {
    console.error('Push notification error:', error);
    return { success: false, error: 'Internal error' };
  }
}

/**
 * Send push notification to a specific subscription
 */
async function sendToSubscription(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushNotificationPayload
): Promise<void> {
  // In production, use web-push library:
  /*
  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    },
    JSON.stringify(payload),
    {
      vapidDetails: {
        subject: VAPID_SUBJECT,
        publicKey: VAPID_PUBLIC_KEY,
        privateKey: VAPID_PRIVATE_KEY,
      },
    }
  );
  */

  // For development, log the notification
  console.log('[WebPush] Would send to:', subscription.endpoint.slice(0, 50) + '...');
  console.log('[WebPush] Payload:', payload);
}

/**
 * Check if current time is within quiet hours
 */
function isQuietHours(
  quietStart: string | null,
  quietEnd: string | null,
  timezone: string
): boolean {
  if (!quietStart || !quietEnd) return false;

  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone,
    });
    const currentTime = formatter.format(now);

    // Simple comparison (assumes quiet hours don't span midnight)
    const startMinutes = timeToMinutes(quietStart);
    const endMinutes = timeToMinutes(quietEnd);
    const currentMinutes = timeToMinutes(currentTime);

    if (startMinutes > endMinutes) {
      // Spans midnight (e.g., 22:00 - 08:00)
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } catch {
    return false;
  }
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function isExpiredError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('expired') ||
      error.message.includes('unsubscribed') ||
      error.message.includes('410')
    );
  }
  return false;
}

/**
 * Notification templates
 */
export const NotificationTemplates = {
  streakReminder6pm: (streak: number): PushNotificationPayload => ({
    title: "Don't break your streak!",
    body: `You're on a ${streak}-day streak. Keep it going today!`,
    icon: '/icon-192.png',
    tag: 'streak-reminder',
    data: { type: 'streak_reminder' },
  }),

  streakDanger9pm: (streak: number): PushNotificationPayload => ({
    title: 'Streak at risk!',
    body: `Your ${streak}-day streak ends at midnight! Complete a task now.`,
    icon: '/icon-192.png',
    tag: 'streak-danger',
    requireInteraction: true,
    data: { type: 'streak_danger' },
    actions: [
      { action: 'open', title: 'Open App' },
    ],
  }),

  achievementUnlocked: (name: string, xp: number): PushNotificationPayload => ({
    title: 'Achievement Unlocked!',
    body: `You earned "${name}" (+${xp} XP)`,
    icon: '/icon-192.png',
    tag: 'achievement',
    data: { type: 'achievement' },
  }),

  leaguePromotion: (newTier: string): PushNotificationPayload => ({
    title: 'Promoted!',
    body: `You've been promoted to ${newTier} League!`,
    icon: '/icon-192.png',
    tag: 'league',
    data: { type: 'league' },
  }),

  leagueDemotion: (newTier: string): PushNotificationPayload => ({
    title: 'League Update',
    body: `You've moved to ${newTier} League. Time to climb back up!`,
    icon: '/icon-192.png',
    tag: 'league',
    data: { type: 'league' },
  }),

  dailyRewardAvailable: (): PushNotificationPayload => ({
    title: 'Daily Reward Available!',
    body: 'Claim your daily login reward before it resets.',
    icon: '/icon-192.png',
    tag: 'daily-reward',
    data: { type: 'daily_reward' },
  }),
};
