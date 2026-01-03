import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { validateInviteCode } from "@/lib/invite-codes";

// POST /api/friends/invite/validate - Validate an invite code (no auth required)
// Returns inviter info if code is valid
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: "Invite code is required" },
        { status: 400 }
      );
    }

    // Validate the invite code
    const validation = validateInviteCode(code);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "Invalid invite code" },
        { status: 400 }
      );
    }

    const inviterId = validation.userId!;

    // Get inviter info
    const inviter = await prisma.profiles.findUnique({
      where: { id: inviterId },
      select: {
        id: true,
        display_name: true,
        username: true,
        avatar_url: true,
      },
    });

    if (!inviter) {
      return NextResponse.json(
        { error: "Inviter not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      inviter,
    });
  } catch (error) {
    console.error("Error validating invite code:", error);
    return NextResponse.json(
      { error: "Failed to validate invite code" },
      { status: 500 }
    );
  }
}
