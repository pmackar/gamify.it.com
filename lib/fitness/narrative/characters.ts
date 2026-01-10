// Pre-made rival character definitions
// Each phantom personality gets a set of possible characters

export interface RivalCharacter {
  id: string;
  name: string;
  personality: 'mirror' | 'rival' | 'mentor' | 'nemesis';
  avatar: string; // SVG or emoji for now, can be image path later
  color: string; // Theme color for the character
  tagline: string;
}

// Character pool - assign based on personality type
export const RIVAL_CHARACTERS: RivalCharacter[] = [
  // Mirror personalities - reflect your own progress
  {
    id: 'shadow',
    name: 'Shadow Self',
    personality: 'mirror',
    avatar: '👤',
    color: '#6366f1',
    tagline: 'Your reflection in the iron',
  },
  {
    id: 'echo',
    name: 'Echo',
    personality: 'mirror',
    avatar: '🪞',
    color: '#8b5cf6',
    tagline: 'Matching you rep for rep',
  },
  {
    id: 'doppel',
    name: 'Doppelganger',
    personality: 'mirror',
    avatar: '👥',
    color: '#a78bfa',
    tagline: 'Are you training hard enough?',
  },

  // Rival personalities - slightly ahead, competitive
  {
    id: 'blaze',
    name: 'Blaze',
    personality: 'rival',
    avatar: '🔥',
    color: '#f97316',
    tagline: 'Always one step ahead',
  },
  {
    id: 'storm',
    name: 'Storm',
    personality: 'rival',
    avatar: '⚡',
    color: '#eab308',
    tagline: 'Can you keep up?',
  },
  {
    id: 'apex',
    name: 'Apex',
    personality: 'rival',
    avatar: '🦅',
    color: '#ef4444',
    tagline: 'Second place is first loser',
  },
  {
    id: 'titan',
    name: 'Titan',
    personality: 'rival',
    avatar: '🗿',
    color: '#dc2626',
    tagline: 'Strength respects strength',
  },

  // Mentor personalities - better but encouraging
  {
    id: 'sage',
    name: 'Iron Sage',
    personality: 'mentor',
    avatar: '🧘',
    color: '#10b981',
    tagline: 'The path to strength is patience',
  },
  {
    id: 'guardian',
    name: 'Guardian',
    personality: 'mentor',
    avatar: '🛡️',
    color: '#14b8a6',
    tagline: 'I believe in your potential',
  },
  {
    id: 'sensei',
    name: 'Sensei',
    personality: 'mentor',
    avatar: '👊',
    color: '#059669',
    tagline: 'Discipline conquers all',
  },

  // Nemesis personalities - volatile, intense rivalry
  {
    id: 'phantom',
    name: 'The Phantom',
    personality: 'nemesis',
    avatar: '👻',
    color: '#7c3aed',
    tagline: 'You\'ll never catch me',
  },
  {
    id: 'beast',
    name: 'Beast Mode',
    personality: 'nemesis',
    avatar: '🐺',
    color: '#be185d',
    tagline: 'Unleash your inner animal',
  },
  {
    id: 'void',
    name: 'The Void',
    personality: 'nemesis',
    avatar: '🌑',
    color: '#4c1d95',
    tagline: 'Your limits are an illusion',
  },
  {
    id: 'iron',
    name: 'Iron Will',
    personality: 'nemesis',
    avatar: '⚔️',
    color: '#991b1b',
    tagline: 'Only the strong survive',
  },
];

// Get characters by personality
export function getCharactersByPersonality(personality: string): RivalCharacter[] {
  return RIVAL_CHARACTERS.filter(c => c.personality === personality);
}

// Get a random character for a personality type
export function getRandomCharacter(personality: 'mirror' | 'rival' | 'mentor' | 'nemesis'): RivalCharacter {
  const characters = getCharactersByPersonality(personality);
  return characters[Math.floor(Math.random() * characters.length)];
}

// Get character by ID
export function getCharacterById(id: string): RivalCharacter | undefined {
  return RIVAL_CHARACTERS.find(c => c.id === id);
}

// Assign a character based on phantom config
export function assignCharacterToPhantom(personality: 'mirror' | 'rival' | 'mentor' | 'nemesis', seed?: string): RivalCharacter {
  const characters = getCharactersByPersonality(personality);

  if (seed) {
    // Deterministic selection based on seed (e.g., rival ID)
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash = hash & hash;
    }
    return characters[Math.abs(hash) % characters.length];
  }

  return characters[Math.floor(Math.random() * characters.length)];
}
