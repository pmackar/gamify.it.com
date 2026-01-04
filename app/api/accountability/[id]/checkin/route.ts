import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthParams, Errors } from "@/lib/api";
import prisma from "@/lib/db";

const CheckinSchema = z.object({
  notes: z.string().max(500).optional(),
  mood: z.number().int().min(1).max(5).optional(),
  completed: z.boolean().optional(),
});

// POST /api/accountability/[id]/checkin - Daily check-in
export const POST = withAuthParams<{ id: string }>(
  async (request, user, { id }) => {
    const partnership = await prisma.accountability_partnerships.findUnique({
      where: { id },
    });

    if (!partnership) {
      return Errors.notFound("Partnership not found");
    }

    if (
      partnership.requester_id !== user.id &&
      partnership.partner_id !== user.id
    ) {
      return Errors.forbidden("Not authorized");
    }

    if (partnership.status !== "ACTIVE") {
      return Errors.invalidInput("Partnership is not active");
    }

    const body = await request.json();
    const parsed = CheckinSchema.safeParse(body);

    if (!parsed.success) {
      return Errors.invalidInput("Invalid check-in data");
    }

    const { notes, mood, completed } = parsed.data;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const existing = await prisma.partnership_checkins.findFirst({
      where: {
        partnership_id: id,
        user_id: user.id,
        date: today,
      },
    });

    if (existing) {
      // Update existing check-in
      const updated = await prisma.partnership_checkins.update({
        where: { id: existing.id },
        data: {
          notes,
          mood,
          completed: completed ?? true,
        },
      });

      return NextResponse.json({
        checkin: {
          id: updated.id,
          date: updated.date.toISOString(),
          completed: updated.completed,
          notes: updated.notes,
          mood: updated.mood,
        },
        updated: true,
      });
    }

    // Create new check-in
    const checkin = await prisma.partnership_checkins.create({
      data: {
        partnership_id: id,
        user_id: user.id,
        date: today,
        notes,
        mood,
        completed: completed ?? true,
      },
    });

    // Notify partner
    const partnerId =
      partnership.requester_id === user.id
        ? partnership.partner_id
        : partnership.requester_id;

    await prisma.activity_feed.create({
      data: {
        user_id: partnerId,
        actor_id: user.id,
        type: "QUEST_ITEM_COMPLETED", // Reusing for check-ins
        entity_type: "accountability_checkin",
        entity_id: checkin.id,
        metadata: {
          partnershipId: id,
          mood,
          message: notes
            ? `Check-in: "${notes.slice(0, 50)}..."`
            : "Checked in today!",
        },
      },
    });

    return NextResponse.json({
      checkin: {
        id: checkin.id,
        date: checkin.date.toISOString(),
        completed: checkin.completed,
        notes: checkin.notes,
        mood: checkin.mood,
      },
      created: true,
    });
  }
);

// GET /api/accountability/[id]/checkin - Get check-in history
export const GET = withAuthParams<{ id: string }>(
  async (request, user, { id }) => {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");

    const partnership = await prisma.accountability_partnerships.findUnique({
      where: { id },
    });

    if (!partnership) {
      return Errors.notFound("Partnership not found");
    }

    if (
      partnership.requester_id !== user.id &&
      partnership.partner_id !== user.id
    ) {
      return Errors.forbidden("Not authorized");
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const checkins = await prisma.partnership_checkins.findMany({
      where: {
        partnership_id: id,
        date: { gte: startDate },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    // Group by date
    const byDate: Record<
      string,
      {
        date: string;
        user?: {
          completed: boolean;
          notes?: string | null;
          mood?: number | null;
        };
        partner?: {
          completed: boolean;
          notes?: string | null;
          mood?: number | null;
        };
      }
    > = {};

    for (const checkin of checkins) {
      const dateStr = checkin.date.toISOString().split("T")[0];
      if (!byDate[dateStr]) {
        byDate[dateStr] = { date: dateStr };
      }

      const isUser = checkin.user_id === user.id;
      const key = isUser ? "user" : "partner";
      byDate[dateStr][key] = {
        completed: checkin.completed,
        notes: checkin.notes,
        mood: checkin.mood,
      };
    }

    return NextResponse.json({
      checkins: Object.values(byDate).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
      partnerId:
        partnership.requester_id === user.id
          ? partnership.partner_id
          : partnership.requester_id,
    });
  }
);
