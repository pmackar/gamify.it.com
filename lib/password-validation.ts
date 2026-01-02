// Password strength validation following OWASP best practices

export interface PasswordValidation {
  isValid: boolean;
  score: number; // 0-5 (0 = very weak, 5 = very strong)
  errors: string[];
  suggestions: string[];
}

// Common passwords to reject (top 100 most common)
const COMMON_PASSWORDS = new Set([
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', 'master',
  'dragon', '111111', 'baseball', 'iloveyou', 'trustno1', 'sunshine', 'ashley',
  'bailey', 'shadow', '123123', '654321', 'superman', 'qazwsx', 'michael',
  'football', 'password1', 'password123', 'batman', 'login', 'admin',
  'passw0rd', 'hello', 'charlie', 'donald', 'loveme', 'soccer', 'letmein',
  'access', 'mustang', 'thunder', 'welcome', 'nothing', 'qwerty123', '000000',
  '1234567', '12345', '1234567890', 'jesus', 'ninja', 'gaming', 'starwars',
  'whatever', 'computer', 'summer', 'princess', '696969', 'cookie', '123abc',
]);

// Sequential patterns to detect
const SEQUENTIAL_PATTERNS = [
  'abcdefghijklmnopqrstuvwxyz',
  'zyxwvutsrqponmlkjihgfedcba',
  '01234567890',
  '09876543210',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
];

function hasSequentialChars(password: string, minLength = 4): boolean {
  const lower = password.toLowerCase();
  for (const pattern of SEQUENTIAL_PATTERNS) {
    for (let i = 0; i <= pattern.length - minLength; i++) {
      const seq = pattern.slice(i, i + minLength);
      if (lower.includes(seq)) return true;
    }
  }
  return false;
}

function hasRepeatingChars(password: string, minRepeats = 3): boolean {
  const regex = new RegExp(`(.)\\1{${minRepeats - 1},}`);
  return regex.test(password);
}

function calculateEntropy(password: string): number {
  let charsetSize = 0;
  if (/[a-z]/.test(password)) charsetSize += 26;
  if (/[A-Z]/.test(password)) charsetSize += 26;
  if (/[0-9]/.test(password)) charsetSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32;

  if (charsetSize === 0) return 0;
  return password.length * Math.log2(charsetSize);
}

export function validatePassword(password: string, email?: string): PasswordValidation {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // Minimum length check (OWASP recommends 8+, we use 10 for better security)
  if (password.length < 10) {
    errors.push('Password must be at least 10 characters long');
  } else {
    score += 1;
  }

  // Maximum length (prevent DoS with very long passwords)
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }

  // Check for common passwords
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('This password is too common and easily guessed');
  } else {
    score += 1;
  }

  // Check for sequential characters
  if (hasSequentialChars(password)) {
    errors.push('Password contains sequential characters (e.g., abc, 123)');
    suggestions.push('Avoid keyboard patterns and sequences');
  }

  // Check for repeating characters
  if (hasRepeatingChars(password)) {
    errors.push('Password contains too many repeating characters');
    suggestions.push('Mix up the characters more');
  }

  // Character diversity checks (recommendations, not requirements per NIST)
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  const diversityCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;

  if (diversityCount >= 3) {
    score += 1;
  } else {
    suggestions.push('Consider adding a mix of uppercase, lowercase, numbers, and symbols');
  }

  // Length bonus
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Entropy check
  const entropy = calculateEntropy(password);
  if (entropy < 40) {
    suggestions.push('Password could be stronger - try making it longer or more varied');
  }

  // Check if password contains email
  if (email) {
    const emailBase = email.split('@')[0].toLowerCase();
    if (emailBase.length >= 3 && password.toLowerCase().includes(emailBase)) {
      errors.push('Password should not contain your email address');
    }
  }

  // Ensure score is in valid range
  score = Math.max(0, Math.min(5, score));

  return {
    isValid: errors.length === 0,
    score,
    errors,
    suggestions: errors.length === 0 ? suggestions : [],
  };
}

export function getPasswordStrengthLabel(score: number): string {
  switch (score) {
    case 0: return 'Very Weak';
    case 1: return 'Weak';
    case 2: return 'Fair';
    case 3: return 'Good';
    case 4: return 'Strong';
    case 5: return 'Very Strong';
    default: return 'Unknown';
  }
}

export function getPasswordStrengthColor(score: number): string {
  switch (score) {
    case 0: return '#ff4444';
    case 1: return '#ff6b6b';
    case 2: return '#ffa500';
    case 3: return '#9acd32';
    case 4: return '#32cd32';
    case 5: return '#00ff00';
    default: return '#888';
  }
}
