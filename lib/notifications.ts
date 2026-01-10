import prisma from "@/lib/db";
import { coaching_notification_type, Prisma } from "@prisma/client";

interface SendNotificationParams {
  recipientId: string;
  senderId?: string;
  type: coaching_notification_type;
  title: string;
  body: string;
  data?: Prisma.InputJsonValue;
}

/**
 * Send a coaching notification to a user
 */
export async function sendNotification({
  recipientId,
  senderId,
  type,
  title,
  body,
  data,
}: SendNotificationParams) {
  return prisma.coaching_notifications.create({
    data: {
      recipient_id: recipientId,
      sender_id: senderId || null,
      type,
      title,
      body,
      data: data ?? Prisma.JsonNull,
    },
  });
}

/**
 * Send notification to multiple recipients
 */
export async function sendBulkNotifications(
  notifications: SendNotificationParams[]
) {
  const data: Prisma.coaching_notificationsCreateManyInput[] = notifications.map((n) => ({
    recipient_id: n.recipientId,
    sender_id: n.senderId || null,
    type: n.type,
    title: n.title,
    body: n.body,
    data: n.data ?? Prisma.JsonNull,
  }));
  return prisma.coaching_notifications.createMany({ data });
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.coaching_notifications.count({
    where: {
      recipient_id: userId,
      read: false,
    },
  });
}

/**
 * Mark notifications as read
 */
export async function markAsRead(notificationIds: string[]) {
  return prisma.coaching_notifications.updateMany({
    where: { id: { in: notificationIds } },
    data: { read: true, read_at: new Date() },
  });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string) {
  return prisma.coaching_notifications.updateMany({
    where: { recipient_id: userId, read: false },
    data: { read: true, read_at: new Date() },
  });
}

// Notification type helpers with pre-built messages
export const NotificationTemplates = {
  workoutCompleted: (athleteName: string, workoutXP: number) => ({
    type: "WORKOUT_COMPLETED" as coaching_notification_type,
    title: "Workout Completed",
    body: `${athleteName} just finished a workout and earned ${workoutXP} XP!`,
  }),

  programAssigned: (programName: string, coachName: string) => ({
    type: "PROGRAM_ASSIGNED" as coaching_notification_type,
    title: "New Program Assigned",
    body: `${coachName} assigned you to "${programName}"`,
  }),

  programUpdated: (programName: string) => ({
    type: "PROGRAM_UPDATED" as coaching_notification_type,
    title: "Program Updated",
    body: `Your program "${programName}" has been updated`,
  }),

  newMessage: (senderName: string, isCoach: boolean) => ({
    type: (isCoach ? "COACH_MESSAGE" : "ATHLETE_MESSAGE") as coaching_notification_type,
    title: "New Message",
    body: `${senderName} sent you a message`,
  }),

  prCelebration: (athleteName: string, exercise: string, weight: number) => ({
    type: "PR_CELEBRATION" as coaching_notification_type,
    title: "New PR! 🎉",
    body: `${athleteName} hit a new PR on ${exercise}: ${weight} lbs`,
  }),

  workoutReminder: () => ({
    type: "WORKOUT_REMINDER" as coaching_notification_type,
    title: "Time to Train",
    body: "You have a workout scheduled today. Let's get after it!",
  }),

  streakWarning: (currentStreak: number) => ({
    type: "STREAK_WARNING" as coaching_notification_type,
    title: "Streak in Danger! ⚠️",
    body: `Don't lose your ${currentStreak}-day streak! Work out today to keep it alive.`,
  }),
};
