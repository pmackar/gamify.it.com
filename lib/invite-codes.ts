import crypto from 'crypto';

const INVITE_EXPIRY_DAYS = 7;
const SECRET = process.env.JWT_SECRET || process.env.INVITE_SECRET || 'gamify-invite-secret-key';

interface InvitePayload {
  u: string; // userId
  e: number; // expiry timestamp
}

interface GeneratedInvite {
  code: string;
  link: string;
  expiresAt: Date;
}

interface ValidatedInvite {
  valid: boolean;
  userId?: string;
  error?: string;
}

function createSignature(payload: string): string {
  return crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('base64url')
    .slice(0, 16); // Short signature for cleaner codes
}

function encodeBase64Url(str: string): string {
  return Buffer.from(str).toString('base64url');
}

function decodeBase64Url(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf8');
}

/**
 * Generate a shareable invite code for a user
 */
export function generateInviteCode(userId: string): GeneratedInvite {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

  const payload: InvitePayload = {
    u: userId,
    e: Math.floor(expiresAt.getTime() / 1000),
  };

  const payloadStr = JSON.stringify(payload);
  const signature = createSignature(payloadStr);

  // Combine payload and signature
  const code = encodeBase64Url(payloadStr) + '.' + signature;

  // Always use the canonical domain for invite links
  const baseUrl = 'https://gamify.it.com';

  return {
    code,
    link: `${baseUrl}/friends/invite/${encodeURIComponent(code)}`,
    expiresAt,
  };
}

/**
 * Validate an invite code and extract the inviter's userId
 */
export function validateInviteCode(code: string): ValidatedInvite {
  try {
    const parts = code.split('.');
    if (parts.length !== 2) {
      return { valid: false, error: 'Invalid code format' };
    }

    const [payloadEncoded, signature] = parts;
    const payloadStr = decodeBase64Url(payloadEncoded);

    // Verify signature
    const expectedSignature = createSignature(payloadStr);
    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid code signature' };
    }

    // Parse payload
    const payload: InvitePayload = JSON.parse(payloadStr);

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.e < now) {
      return { valid: false, error: 'Invite code has expired' };
    }

    return {
      valid: true,
      userId: payload.u,
    };
  } catch (error) {
    return { valid: false, error: 'Invalid code' };
  }
}

/**
 * Format a code for display (add dashes for readability)
 */
export function formatCodeForDisplay(code: string): string {
  // Take first 12 chars of the code for a shorter display version
  const shortCode = code.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12).toUpperCase();
  // Add dashes every 4 characters
  return shortCode.match(/.{1,4}/g)?.join('-') || shortCode;
}
