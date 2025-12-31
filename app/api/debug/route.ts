import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    clientIdLength: process.env.GOOGLE_CLIENT_ID?.length || 0,
    clientIdStart: process.env.GOOGLE_CLIENT_ID?.substring(0, 15) || "not set",
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    secretLength: process.env.GOOGLE_CLIENT_SECRET?.length || 0,
    nextAuthUrl: process.env.NEXTAUTH_URL || "not set",
    nodeEnv: process.env.NODE_ENV,
  });
}
