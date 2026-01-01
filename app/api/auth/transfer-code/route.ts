import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// In-memory store for transfer codes (in production, use Redis or database)
// Map: code -> { userId, email, expiresAt, accessToken, refreshToken }
const transferCodes = new Map<string, {
  userId: string;
  email: string;
  expiresAt: number;
  accessToken: string;
  refreshToken: string;
}>();

// Clean up expired codes periodically
function cleanupExpiredCodes() {
  const now = Date.now();
  for (const [code, data] of transferCodes.entries()) {
    if (data.expiresAt < now) {
      transferCodes.delete(code);
    }
  }
}

// Generate a 6-digit code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST: Generate a transfer code for the current user
export async function POST() {
  try {
    cleanupExpiredCodes();

    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Generate unique code
    let code = generateCode();
    while (transferCodes.has(code)) {
      code = generateCode();
    }

    // Store code with 60 second expiry
    transferCodes.set(code, {
      userId: session.user.id,
      email: session.user.email || '',
      expiresAt: Date.now() + 60000, // 60 seconds
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    });

    console.log('Generated transfer code for user:', session.user.email);

    return NextResponse.json({
      code,
      expiresIn: 60,
      email: session.user.email
    });
  } catch (e) {
    console.error('Transfer code generation error:', e);
    return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
  }
}

// GET: Verify a transfer code and return session tokens
export async function GET(request: Request) {
  try {
    cleanupExpiredCodes();

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Code required' }, { status: 400 });
    }

    const data = transferCodes.get(code);

    if (!data) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 });
    }

    if (data.expiresAt < Date.now()) {
      transferCodes.delete(code);
      return NextResponse.json({ error: 'Code expired' }, { status: 401 });
    }

    // Delete code after use (one-time use)
    transferCodes.delete(code);

    console.log('Transfer code verified for user:', data.email);

    // Return the session tokens for the PWA to use
    return NextResponse.json({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      email: data.email,
      userId: data.userId,
    });
  } catch (e) {
    console.error('Transfer code verification error:', e);
    return NextResponse.json({ error: 'Failed to verify code' }, { status: 500 });
  }
}
