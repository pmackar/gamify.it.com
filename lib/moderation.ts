// Basic spam detection and content moderation utilities

interface SpamCheckResult {
  isSpam: boolean;
  reason: string | null;
  score: number; // 0-100, higher = more likely spam
}

// Common spam patterns
const SPAM_PATTERNS = [
  /\b(buy|sell|discount|offer|free|click here|act now|limited time)\b/gi,
  /\b(viagra|cialis|casino|lottery|prize|winner|congratulations)\b/gi,
  /(http|https):\/\/[^\s]+/g, // URLs (suspicious in reviews)
  /(.)\1{4,}/g, // Repeated characters (e.g., "aaaaaa")
  /[A-Z]{5,}/g, // All caps words
];

// Prohibited words (severe - immediate flag)
const PROHIBITED_WORDS = [
  // Add prohibited words here - keeping minimal for now
];

// Suspicious patterns that increase spam score
const SUSPICIOUS_PATTERNS = [
  { pattern: /\$\d+/g, score: 10, reason: 'Contains dollar amounts' },
  { pattern: /\d{10,}/g, score: 15, reason: 'Contains long number sequences' },
  { pattern: /[!?]{3,}/g, score: 5, reason: 'Excessive punctuation' },
  { pattern: /\b(www\.|\.com|\.net|\.org)\b/gi, score: 20, reason: 'Contains website references' },
  { pattern: /@[a-zA-Z0-9_]+/g, score: 10, reason: 'Contains social media handles' },
];

export function checkForSpam(content: string, title?: string | null): SpamCheckResult {
  const textToCheck = `${title || ''} ${content}`.toLowerCase();
  let score = 0;
  const reasons: string[] = [];

  // Check for prohibited words (immediate flag)
  for (const word of PROHIBITED_WORDS) {
    if (textToCheck.includes(word.toLowerCase())) {
      return {
        isSpam: true,
        reason: 'Contains prohibited content',
        score: 100,
      };
    }
  }

  // Check spam patterns
  for (const pattern of SPAM_PATTERNS) {
    const matches = textToCheck.match(pattern);
    if (matches && matches.length > 0) {
      score += 15 * matches.length;
      reasons.push(`Spam pattern detected`);
    }
  }

  // Check suspicious patterns
  for (const { pattern, score: patternScore, reason } of SUSPICIOUS_PATTERNS) {
    const matches = textToCheck.match(pattern);
    if (matches && matches.length > 0) {
      score += patternScore * Math.min(matches.length, 3);
      reasons.push(reason);
    }
  }

  // Content length checks
  if (content.length < 10) {
    score += 20;
    reasons.push('Content too short');
  }

  if (content.length > 5000) {
    score += 15;
    reasons.push('Content unusually long');
  }

  // Ratio of uppercase letters
  const uppercaseRatio = (content.match(/[A-Z]/g)?.length || 0) / content.length;
  if (uppercaseRatio > 0.5 && content.length > 20) {
    score += 25;
    reasons.push('Excessive uppercase');
  }

  // Check for repetitive content
  const words = textToCheck.split(/\s+/);
  const uniqueWords = new Set(words);
  const repetitionRatio = uniqueWords.size / words.length;
  if (repetitionRatio < 0.3 && words.length > 10) {
    score += 30;
    reasons.push('Highly repetitive content');
  }

  // Cap score at 100
  score = Math.min(score, 100);

  return {
    isSpam: score >= 50,
    reason: reasons.length > 0 ? reasons.join('; ') : null,
    score,
  };
}

export function sanitizeContent(content: string): string {
  // Basic HTML entity encoding
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface ModerationAction {
  action: 'APPROVE' | 'REJECT' | 'FLAG';
  reason?: string;
  moderatorId: string;
}

export function validateModerationAction(action: ModerationAction): boolean {
  if (!['APPROVE', 'REJECT', 'FLAG'].includes(action.action)) {
    return false;
  }

  if (action.action === 'REJECT' && !action.reason) {
    return false; // Rejection requires a reason
  }

  return true;
}

// Review status transitions
export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['APPROVED', 'REJECTED', 'FLAGGED'],
  FLAGGED: ['APPROVED', 'REJECTED'],
  APPROVED: ['FLAGGED', 'REJECTED'],
  REJECTED: ['APPROVED'], // Allow appeal/reversal
};

export function canTransitionStatus(currentStatus: string, newStatus: string): boolean {
  const validTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
  return validTransitions?.includes(newStatus) || false;
}
