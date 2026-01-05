import { NextResponse } from 'next/server';
import { withAuth, Errors } from '@/lib/api';
import prisma from '@/lib/db';

/**
 * GET /api/fitness/accountability
 *
 * Get user's accountability partners and their status
 */
export const GET = withAuth(async (_request, user) => {
  // Get user's active partnerships
  const partnerships = await prisma.accountability_partnerships.findMany({
    where: {
      OR: [
        { requester_id: user.id },
        { partner_id: user.id },
      ],
      status: 'ACTIVE',
    },
    include: {
      requester: {
        select: {
          id: true,
          display_name: true,
          avatar_url: true,
          current_streak: true,
        },
      },
      partner: {
        select: {
          id: true,
          display_name: true,
          avatar_url: true,
          current_streak: true,
        },
      },
      goals: {
        where: { active: true },
      },
    },
  });

  // Get today's check-ins for all partnerships
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkIns = await prisma.partnership_checkins.findMany({
    where: {
      partnership_id: { in: partnerships.map(p => p.id) },
      date: today,
    },
  });

  // Build partner list
  const partners = partnerships.map(p => {
    const isRequester = p.requester_id === user.id;
    const partnerProfile = isRequester ? p.partner : p.requester;
    const partnerId = isRequester ? p.partner_id : p.requester_id;

    const userCheckIn = checkIns.find(c => c.user_id === user.id && c.partnership_id === p.id);
    const partnerCheckIn = checkIns.find(c => c.user_id === partnerId && c.partnership_id === p.id);

    // Calculate streak (days both checked in consecutively)
    const streak = calculatePartnershipStreak(p.id, checkIns);

    return {
      partnershipId: p.id,
      partnerId,
      name: partnerProfile.display_name || 'Partner',
      avatar: partnerProfile.avatar_url,
      partnerStreak: partnerProfile.current_streak || 0,
      userCheckedIn: !!userCheckIn,
      partnerCheckedIn: !!partnerCheckIn,
      bothCheckedIn: !!userCheckIn && !!partnerCheckIn,
      goals: p.goals.map(g => ({
        id: g.id,
        title: g.title,
        target: g.target,
        userProgress: isRequester ? g.current_user1 : g.current_user2,
        partnerProgress: isRequester ? g.current_user2 : g.current_user1,
        period: g.period,
      })),
      startedAt: p.started_at,
    };
  });

  // Get pending requests (incoming)
  const pendingRequests = await prisma.accountability_partnerships.findMany({
    where: {
      partner_id: user.id,
      status: 'PENDING',
    },
    include: {
      requester: {
        select: {
          id: true,
          display_name: true,
          avatar_url: true,
        },
      },
    },
  });

  // Get sent requests (outgoing)
  const sentRequests = await prisma.accountability_partnerships.findMany({
    where: {
      requester_id: user.id,
      status: 'PENDING',
    },
    include: {
      partner: {
        select: {
          id: true,
          display_name: true,
          avatar_url: true,
        },
      },
    },
  });

  return NextResponse.json({
    partners,
    pendingRequests: pendingRequests.map(r => ({
      id: r.id,
      fromId: r.requester_id,
      fromName: r.requester.display_name || 'User',
      fromAvatar: r.requester.avatar_url,
      message: r.message,
      sentAt: r.created_at,
    })),
    sentRequests: sentRequests.map(r => ({
      id: r.id,
      toId: r.partner_id,
      toName: r.partner.display_name || 'User',
      toAvatar: r.partner.avatar_url,
      sentAt: r.created_at,
    })),
  });
});

/**
 * POST /api/fitness/accountability
 *
 * Send accountability partner request or check in
 */
export const POST = withAuth(async (request, user) => {
  const body = await request.json();
  const { action, partnerId, partnershipId, message, mood, notes } = body;

  switch (action) {
    case 'request': {
      if (!partnerId) {
        return Errors.invalidInput('Partner ID required');
      }

      // Check if already partners or pending
      const existing = await prisma.accountability_partnerships.findFirst({
        where: {
          OR: [
            { requester_id: user.id, partner_id: partnerId },
            { requester_id: partnerId, partner_id: user.id },
          ],
          status: { in: ['PENDING', 'ACTIVE'] },
        },
      });

      if (existing) {
        return Errors.invalidInput('Partnership already exists or pending');
      }

      // Check if they're friends
      const friendship = await prisma.friendships.findFirst({
        where: {
          OR: [
            { user_id: user.id, friend_id: partnerId },
            { user_id: partnerId, friend_id: user.id },
          ],
          status: 'accepted',
        },
      });

      if (!friendship) {
        return Errors.invalidInput('Must be friends first');
      }

      // Create partnership request
      const partnership = await prisma.accountability_partnerships.create({
        data: {
          requester_id: user.id,
          partner_id: partnerId,
          status: 'PENDING',
          message,
        },
      });

      return NextResponse.json({
        success: true,
        partnershipId: partnership.id,
        message: 'Request sent!',
      });
    }

    case 'respond': {
      if (!partnershipId) {
        return Errors.invalidInput('Partnership ID required');
      }

      const partnership = await prisma.accountability_partnerships.findUnique({
        where: { id: partnershipId },
      });

      if (!partnership || partnership.partner_id !== user.id) {
        return Errors.notFound('Request');
      }

      const accept = body.accept !== false;

      await prisma.accountability_partnerships.update({
        where: { id: partnershipId },
        data: {
          status: accept ? 'ACTIVE' : 'ENDED',
          started_at: accept ? new Date() : undefined,
        },
      });

      return NextResponse.json({
        success: true,
        message: accept ? 'Partnership started!' : 'Request declined',
      });
    }

    case 'checkin': {
      if (!partnershipId) {
        return Errors.invalidInput('Partnership ID required');
      }

      // Verify user is part of this partnership
      const partnership = await prisma.accountability_partnerships.findUnique({
        where: { id: partnershipId },
      });

      if (!partnership ||
          (partnership.requester_id !== user.id && partnership.partner_id !== user.id)) {
        return Errors.notFound('Partnership');
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Create or update check-in
      const checkin = await prisma.partnership_checkins.upsert({
        where: {
          partnership_id_user_id_date: {
            partnership_id: partnershipId,
            user_id: user.id,
            date: today,
          },
        },
        create: {
          partnership_id: partnershipId,
          user_id: user.id,
          date: today,
          completed: true,
          mood,
          notes,
        },
        update: {
          completed: true,
          mood,
          notes,
        },
      });

      // Check if partner also checked in
      const partnerId = partnership.requester_id === user.id
        ? partnership.partner_id
        : partnership.requester_id;

      const partnerCheckin = await prisma.partnership_checkins.findUnique({
        where: {
          partnership_id_user_id_date: {
            partnership_id: partnershipId,
            user_id: partnerId,
            date: today,
          },
        },
      });

      return NextResponse.json({
        success: true,
        checkinId: checkin.id,
        bothCheckedIn: !!partnerCheckin,
        message: partnerCheckin
          ? 'Both of you checked in! 🎉'
          : 'Checked in! Waiting for your partner.',
      });
    }

    case 'nudge': {
      if (!partnershipId) {
        return Errors.invalidInput('Partnership ID required');
      }

      const partnership = await prisma.accountability_partnerships.findUnique({
        where: { id: partnershipId },
      });

      if (!partnership ||
          (partnership.requester_id !== user.id && partnership.partner_id !== user.id)) {
        return Errors.notFound('Partnership');
      }

      const recipientId = partnership.requester_id === user.id
        ? partnership.partner_id
        : partnership.requester_id;

      // Check if already nudged today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const recentNudge = await prisma.partnership_nudges.findFirst({
        where: {
          partnership_id: partnershipId,
          sender_id: user.id,
          created_at: { gte: today },
        },
      });

      if (recentNudge) {
        return Errors.invalidInput('Already nudged today');
      }

      await prisma.partnership_nudges.create({
        data: {
          partnership_id: partnershipId,
          sender_id: user.id,
          recipient_id: recipientId,
          message: message || "Hey! Don't forget to work out today! 💪",
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Nudge sent!',
      });
    }

    default:
      return Errors.invalidInput('Unknown action');
  }
});

// Helper to calculate consecutive days both partners checked in
function calculatePartnershipStreak(partnershipId: string, checkIns: any[]): number {
  // This is a simplified version - would need to query historical check-ins
  // for accurate streak calculation
  return 0;
}
