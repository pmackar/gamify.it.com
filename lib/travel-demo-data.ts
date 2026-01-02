export const DEMO_USER = {
  name: "Demo Explorer",
  level: 8,
  xp: 2450,
  xpToNext: 3000,
  currentStreak: 12,
};

export const DEMO_STATS = {
  counts: {
    cities: 7,
    locations: 24,
    visits: 31,
    countries: 4,
  },
  achievements: {
    unlocked: 8,
    total: 25,
  },
  topLocations: [
    {
      id: "demo-1",
      name: "Shibuya Crossing",
      type: "landmark",
      avgRating: 5.0,
      city: { name: "Tokyo", country: "Japan" },
    },
    {
      id: "demo-2",
      name: "Louvre Museum",
      type: "museum",
      avgRating: 4.8,
      city: { name: "Paris", country: "France" },
    },
    {
      id: "demo-3",
      name: "Central Park",
      type: "park",
      avgRating: 4.7,
      city: { name: "New York", country: "USA" },
    },
  ],
};

export const DEMO_CITIES = [
  {
    id: "demo-city-1",
    name: "Tokyo",
    country: "Japan",
    locationCount: 8,
    visitCount: 12,
  },
  {
    id: "demo-city-2",
    name: "Paris",
    country: "France",
    locationCount: 6,
    visitCount: 7,
  },
  {
    id: "demo-city-3",
    name: "New York",
    country: "USA",
    locationCount: 5,
    visitCount: 6,
  },
  {
    id: "demo-city-4",
    name: "Barcelona",
    country: "Spain",
    locationCount: 5,
    visitCount: 6,
  },
];

export const DEMO_LOCATIONS = [
  {
    id: "demo-loc-1",
    name: "Shibuya Crossing",
    type: "landmark",
    avgRating: 5.0,
    visitCount: 3,
    city: { name: "Tokyo", country: "Japan" },
    notes: "The famous scramble crossing - an absolute must-see!",
  },
  {
    id: "demo-loc-2",
    name: "Senso-ji Temple",
    type: "temple",
    avgRating: 4.9,
    visitCount: 2,
    city: { name: "Tokyo", country: "Japan" },
    notes: "Beautiful ancient temple in Asakusa district",
  },
  {
    id: "demo-loc-3",
    name: "Louvre Museum",
    type: "museum",
    avgRating: 4.8,
    visitCount: 1,
    city: { name: "Paris", country: "France" },
    notes: "Home of the Mona Lisa - incredible art collection",
  },
  {
    id: "demo-loc-4",
    name: "Eiffel Tower",
    type: "landmark",
    avgRating: 4.6,
    visitCount: 2,
    city: { name: "Paris", country: "France" },
    notes: "Stunning views from the top, especially at night",
  },
  {
    id: "demo-loc-5",
    name: "Central Park",
    type: "park",
    avgRating: 4.7,
    visitCount: 2,
    city: { name: "New York", country: "USA" },
    notes: "Perfect escape from the city buzz",
  },
  {
    id: "demo-loc-6",
    name: "La Sagrada Familia",
    type: "church",
    avgRating: 4.9,
    visitCount: 1,
    city: { name: "Barcelona", country: "Spain" },
    notes: "Gaudi's masterpiece - architecture like nothing else",
  },
];

export const DEMO_ACHIEVEMENTS = [
  {
    id: "demo-ach-1",
    name: "First Steps",
    description: "Log your first location",
    tier: "common",
    unlocked: true,
    icon: "footprints",
  },
  {
    id: "demo-ach-2",
    name: "City Hopper",
    description: "Visit 5 different cities",
    tier: "uncommon",
    unlocked: true,
    icon: "building",
  },
  {
    id: "demo-ach-3",
    name: "Globe Trotter",
    description: "Visit 3 different countries",
    tier: "rare",
    unlocked: true,
    icon: "globe",
  },
  {
    id: "demo-ach-4",
    name: "Food Critic",
    description: "Rate 10 restaurants",
    tier: "uncommon",
    unlocked: false,
    icon: "utensils",
    progress: { current: 6, total: 10 },
  },
  {
    id: "demo-ach-5",
    name: "Culture Vulture",
    description: "Visit 5 museums",
    tier: "rare",
    unlocked: false,
    icon: "landmark",
    progress: { current: 3, total: 5 },
  },
];
