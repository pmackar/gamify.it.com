/**
 * Narrative Engine - Settings API
 *
 * GET: Get user's narrative settings
 * PATCH: Update narrative settings
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { withAuth, validateBody } from "@/lib/api";
import prisma from "@/lib/db";
import { DEFAULT_NARRATIVE_SETTINGS } from "@/lib/fitness/types";

// Schema for updating settings
const updateSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  encounterFrequency: z
    .enum(["every_workout", "daily", "weekly", "custom"])
    .optional(),
  customFrequencyDays: z.number().min(1).max(30).optional(),
  aiRivalsEnabled: z.boolean().optional(),
  friendRivalsEnabled: z.boolean().optional(),
  maxActiveRivals: z.number().min(1).max(10).optional(),
  showdownDay: z.number().min(0).max(6).optional(),
  activeTheme: z.string().nullable().optional(),
  notificationPreferences: z
    .object({
      encounterPopups: z.boolean().optional(),
      weeklyShowdowns: z.boolean().optional(),
      tauntNotifications: z.boolean().optional(),
    })
    .optional(),
});

interface NotificationPrefs {
  encounterPopups: boolean;
  weeklyShowdowns: boolean;
  tauntNotifications: boolean;
}

// GET /api/fitness/narrative/settings - Get user's narrative settings
export const GET = withAuth(async (_request, user) => {
  const settings = await prisma.fitness_narrative_settings.findUnique({
    where: { user_id: user.id },
  });

  if (!settings) {
    // Return defaults if no settings exist
    return NextResponse.json({
      ...DEFAULT_NARRATIVE_SETTINGS,
      userId: user.id,
    });
  }

  const notifPrefs = settings.notification_prefs as unknown as NotificationPrefs;

  return NextResponse.json({
    userId: settings.user_id,
    enabled: settings.enabled,
    encounterFrequency: settings.encounter_frequency,
    customFrequencyDays: settings.custom_frequency_days,
    aiRivalsEnabled: settings.ai_rivals_enabled,
    friendRivalsEnabled: settings.friend_rivals_enabled,
    maxActiveRivals: settings.max_active_rivals,
    showdownDay: settings.showdown_day,
    activeTheme: settings.active_theme,
    notificationPreferences: {
      encounterPopups: notifPrefs?.encounterPopups ?? true,
      weeklyShowdowns: notifPrefs?.weeklyShowdowns ?? true,
      tauntNotifications: notifPrefs?.tauntNotifications ?? false,
    },
    updatedAt: settings.updated_at?.toISOString(),
  });
});

// PATCH /api/fitness/narrative/settings - Update settings
export const PATCH = withAuth(async (request, user) => {
  const body = await validateBody(request, updateSettingsSchema);
  if (body instanceof NextResponse) return body;

  // Get existing settings to merge notification prefs
  const existing = await prisma.fitness_narrative_settings.findUnique({
    where: { user_id: user.id },
  });

  const existingNotifPrefs = (existing?.notification_prefs as unknown as NotificationPrefs) || {
    encounterPopups: DEFAULT_NARRATIVE_SETTINGS.notificationPreferences.encounterPopups,
    weeklyShowdowns: DEFAULT_NARRATIVE_SETTINGS.notificationPreferences.weeklyShowdowns,
    tauntNotifications: DEFAULT_NARRATIVE_SETTINGS.notificationPreferences.tauntNotifications,
  };

  // Build notification prefs update
  const newNotifPrefs: NotificationPrefs = {
    encounterPopups: body.notificationPreferences?.encounterPopups ?? existingNotifPrefs.encounterPopups,
    weeklyShowdowns: body.notificationPreferences?.weeklyShowdowns ?? existingNotifPrefs.weeklyShowdowns,
    tauntNotifications: body.notificationPreferences?.tauntNotifications ?? existingNotifPrefs.tauntNotifications,
  };

  // Build update data
  const updateData: Record<string, unknown> = {};

  if (body.enabled !== undefined) updateData.enabled = body.enabled;
  if (body.encounterFrequency)
    updateData.encounter_frequency = body.encounterFrequency;
  if (body.customFrequencyDays !== undefined)
    updateData.custom_frequency_days = body.customFrequencyDays;
  if (body.aiRivalsEnabled !== undefined)
    updateData.ai_rivals_enabled = body.aiRivalsEnabled;
  if (body.friendRivalsEnabled !== undefined)
    updateData.friend_rivals_enabled = body.friendRivalsEnabled;
  if (body.maxActiveRivals !== undefined)
    updateData.max_active_rivals = body.maxActiveRivals;
  if (body.showdownDay !== undefined) updateData.showdown_day = body.showdownDay;
  if (body.activeTheme !== undefined) updateData.active_theme = body.activeTheme;
  if (body.notificationPreferences)
    updateData.notification_prefs = newNotifPrefs as unknown as Prisma.InputJsonValue;

  updateData.updated_at = new Date();

  // Upsert settings
  const settings = await prisma.fitness_narrative_settings.upsert({
    where: { user_id: user.id },
    update: updateData,
    create: {
      user_id: user.id,
      enabled: body.enabled ?? DEFAULT_NARRATIVE_SETTINGS.enabled,
      encounter_frequency:
        body.encounterFrequency ??
        DEFAULT_NARRATIVE_SETTINGS.encounterFrequency,
      custom_frequency_days: body.customFrequencyDays ?? null,
      ai_rivals_enabled:
        body.aiRivalsEnabled ?? DEFAULT_NARRATIVE_SETTINGS.aiRivalsEnabled,
      friend_rivals_enabled:
        body.friendRivalsEnabled ??
        DEFAULT_NARRATIVE_SETTINGS.friendRivalsEnabled,
      max_active_rivals:
        body.maxActiveRivals ?? DEFAULT_NARRATIVE_SETTINGS.maxActiveRivals,
      showdown_day: body.showdownDay ?? DEFAULT_NARRATIVE_SETTINGS.showdownDay,
      active_theme: body.activeTheme ?? null,
      notification_prefs: newNotifPrefs as unknown as Prisma.InputJsonValue,
      updated_at: new Date(),
    },
  });

  const notifPrefs = settings.notification_prefs as unknown as NotificationPrefs;

  return NextResponse.json({
    userId: settings.user_id,
    enabled: settings.enabled,
    encounterFrequency: settings.encounter_frequency,
    customFrequencyDays: settings.custom_frequency_days,
    aiRivalsEnabled: settings.ai_rivals_enabled,
    friendRivalsEnabled: settings.friend_rivals_enabled,
    maxActiveRivals: settings.max_active_rivals,
    showdownDay: settings.showdown_day,
    activeTheme: settings.active_theme,
    notificationPreferences: {
      encounterPopups: notifPrefs?.encounterPopups ?? true,
      weeklyShowdowns: notifPrefs?.weeklyShowdowns ?? true,
      tauntNotifications: notifPrefs?.tauntNotifications ?? false,
    },
    updatedAt: settings.updated_at?.toISOString(),
  });
});
