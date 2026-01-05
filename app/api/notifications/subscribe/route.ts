import { NextResponse } from 'next/server';
import { withAuth, Errors } from '@/lib/api';
import prisma from '@/lib/db';
import { VAPID_PUBLIC_KEY } from '@/lib/notifications/web-push';

/**
 * GET /api/notifications/subscribe
 *
 * Get VAPID public key for push subscription
 */
export const GET = withAuth(async (_request, user) => {
  // Check if user already has subscriptions
  const subscriptionCount = await prisma.push_subscriptions.count({
    where: { user_id: user.id },
  });

  return NextResponse.json({
    vapidPublicKey: VAPID_PUBLIC_KEY,
    hasSubscription: subscriptionCount > 0,
  });
});

/**
 * POST /api/notifications/subscribe
 *
 * Save push subscription
 */
export const POST = withAuth(async (request, user) => {
  const body = await request.json();
  const { subscription, userAgent } = body;

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return Errors.invalidInput('Invalid subscription data');
  }

  // Check if subscription already exists
  const existing = await prisma.push_subscriptions.findUnique({
    where: { endpoint: subscription.endpoint },
  });

  if (existing) {
    // Update existing subscription
    await prisma.push_subscriptions.update({
      where: { id: existing.id },
      data: {
        user_id: user.id,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: userAgent,
        last_used: new Date(),
      },
    });
  } else {
    // Create new subscription
    await prisma.push_subscriptions.create({
      data: {
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: userAgent,
      },
    });
  }

  // Create default preferences if they don't exist
  await prisma.notification_preferences.upsert({
    where: { user_id: user.id },
    update: {},
    create: {
      user_id: user.id,
      push_enabled: true,
    },
  });

  return NextResponse.json({
    success: true,
    message: 'Push subscription saved',
  });
});

/**
 * DELETE /api/notifications/subscribe
 *
 * Remove push subscription
 */
export const DELETE = withAuth(async (request, user) => {
  const body = await request.json();
  const { endpoint } = body;

  if (endpoint) {
    // Remove specific subscription
    await prisma.push_subscriptions.deleteMany({
      where: {
        user_id: user.id,
        endpoint,
      },
    });
  } else {
    // Remove all user subscriptions
    await prisma.push_subscriptions.deleteMany({
      where: { user_id: user.id },
    });
  }

  return NextResponse.json({
    success: true,
    message: 'Subscription removed',
  });
});
