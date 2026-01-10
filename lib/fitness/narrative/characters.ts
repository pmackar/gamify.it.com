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

// Character pool - 1 character per personality type
export const RIVAL_CHARACTERS: RivalCharacter[] = [
  // Mirror - reflects your own progress
  {
    id: 'shadow',
    name: 'Shadow Self',
    personality: 'mirror',
    avatar: '🪞',
    color: '#6366f1',
    tagline: 'Your reflection in the iron',
  },

  // Rival - slightly ahead, competitive
  {
    id: 'blaze',
    name: 'Blaze',
    personality: 'rival',
    avatar: '🔥',
    color: '#f97316',
    tagline: 'Always one step ahead',
  },

  // Mentor - better but encouraging
  {
    id: 'sage',
    name: 'Iron Sage',
    personality: 'mentor',
    avatar: '🧘',
    color: '#10b981',
    tagline: 'The path to strength is patience',
  },

  // Nemesis - volatile, intense rivalry
  {
    id: 'phantom',
    name: 'The Phantom',
    personality: 'nemesis',
    avatar: '👻',
    color: '#7c3aed',
    tagline: 'You\'ll never catch me',
  },
];

// Get characters by personality
export function getCharactersByPersonality(personality: string): RivalCharacter[] {
  return RIVAL_CHARACTERS.filter(c => c.personality === personality);
}

// Get the single character for a personality type
export function getCharacterForPersonality(personality: 'mirror' | 'rival' | 'mentor' | 'nemesis'): RivalCharacter {
  const character = RIVAL_CHARACTERS.find(c => c.personality === personality);
  if (!character) {
    throw new Error(`No character found for personality: ${personality}`);
  }
  return character;
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
