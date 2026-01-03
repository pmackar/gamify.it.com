import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/accountability/[id]/respond - Accept or decline partnership
export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const { action } = body; // 'accept' or 'decline'

    if (!action || !["accept", "decline"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const partnership = await prisma.accountability_partnerships.findUnique({
      where: { id },
      include: {
        requester: {
          select: { id: true, display_name: true, username: true },
        },
      },
    });

    if (!partnership) {
      return NextResponse.json(
        { error: "Partnership not found" },
        { status: 404 }
      );
    }

    // Only the partner (addressee) can respond
    if (partnership.partner_id !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (partnership.status !== "PENDING") {
      return NextResponse.json(
        { error: "Partnership is not pending" },
        { status: 400 }
      );
    }

    if (action === "accept") {
      await prisma.accountability_partnerships.update({
        where: { id },
        data: {
          status: "ACTIVE",
          started_at: new Date(),
        },
      });

      // Notify requester
      await prisma.activity_feed.create({
        data: {
          user_id: partnership.requester_id,
          actor_id: user.id,
          type: "FRIEND_REQUEST_ACCEPTED", // Reusing
          entity_type: "accountability_partnership",
          entity_id: id,
          metadata: {
            partnershipId: id,
          },
        },
      });

      return NextResponse.json({ success: true, status: "ACTIVE" });
    } else {
      await prisma.accountability_partnerships.update({
        where: { id },
        data: {
          status: "ENDED",
          ended_at: new Date(),
        },
      });

      return NextResponse.json({ success: true, status: "ENDED" });
    }
  } catch (error) {
    console.error("Error responding to partnership:", error);
    return NextResponse.json(
      { error: "Failed to respond to partnership" },
      { status: 500 }
    );
  }
}
