// High-contrast location type colors for dark backgrounds
// All colors are AA accessible on #1a1a1a and darker

export const LOCATION_TYPE_COLORS: Record<string, { bg: string; border: string; text: string; emoji: string }> = {
  RESTAURANT: { bg: 'rgba(255, 138, 101, 0.15)', border: '#FF8A65', text: '#FF8A65', emoji: '🍽️' },
  BAR: { bg: 'rgba(206, 147, 216, 0.15)', border: '#CE93D8', text: '#CE93D8', emoji: '🍺' },
  CAFE: { bg: 'rgba(188, 170, 164, 0.15)', border: '#BCAAA4', text: '#BCAAA4', emoji: '☕' },
  ATTRACTION: { bg: 'rgba(255, 213, 79, 0.15)', border: '#FFD54F', text: '#FFD54F', emoji: '⭐' },
  HOTEL: { bg: 'rgba(179, 157, 219, 0.15)', border: '#B39DDB', text: '#B39DDB', emoji: '🏨' },
  SHOP: { bg: 'rgba(244, 143, 177, 0.15)', border: '#F48FB1', text: '#F48FB1', emoji: '🛍️' },
  NATURE: { bg: 'rgba(129, 199, 132, 0.15)', border: '#81C784', text: '#81C784', emoji: '🌲' },
  MUSEUM: { bg: 'rgba(144, 202, 249, 0.15)', border: '#90CAF9', text: '#90CAF9', emoji: '🏛️' },
  BEACH: { bg: 'rgba(77, 208, 225, 0.15)', border: '#4DD0E1', text: '#4DD0E1', emoji: '🏖️' },
  NIGHTLIFE: { bg: 'rgba(255, 183, 77, 0.15)', border: '#FFB74D', text: '#FFB74D', emoji: '🌙' },
  LANDMARK: { bg: 'rgba(255, 213, 79, 0.15)', border: '#FFD54F', text: '#FFD54F', emoji: '🏛️' },
  OTHER: { bg: 'rgba(176, 190, 197, 0.15)', border: '#B0BEC5', text: '#B0BEC5', emoji: '📍' },
};

export const LOCATION_TYPES = [
  { value: 'RESTAURANT', label: 'Restaurant' },
  { value: 'BAR', label: 'Bar' },
  { value: 'CAFE', label: 'Cafe' },
  { value: 'ATTRACTION', label: 'Attraction' },
  { value: 'HOTEL', label: 'Hotel' },
  { value: 'SHOP', label: 'Shop' },
  { value: 'NATURE', label: 'Nature' },
  { value: 'MUSEUM', label: 'Museum' },
  { value: 'BEACH', label: 'Beach' },
  { value: 'NIGHTLIFE', label: 'Nightlife' },
  { value: 'OTHER', label: 'Other' },
] as const;

export function getTypeColor(type: string) {
  return LOCATION_TYPE_COLORS[type] || LOCATION_TYPE_COLORS.OTHER;
}

export function getTypeEmoji(type: string) {
  return LOCATION_TYPE_COLORS[type]?.emoji || '📍';
}
