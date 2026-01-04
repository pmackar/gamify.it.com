/**
 * OpenStreetMap Overpass API Fetcher
 *
 * API Documentation: https://wiki.openstreetmap.org/wiki/Overpass_API
 * License: Open Database License (ODbL) - free to use, requires attribution
 * Rate limit: Be respectful, ~1 request per second recommended
 *
 * Attribution requirement: "© OpenStreetMap contributors"
 */

export interface OSMElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface NormalizedPlace {
  id: string;
  source: 'openstreetmap';
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  description: string | null;
  website: string | null;
  phone: string | null;
  hours: string | null;
  priceLevel: number | null;
  categories: string[];
  rating: number | null;
}

// OSM tag mappings for different location types
// Using 8km radius to avoid timeouts in dense cities
const RADIUS = 8000;

export const OSM_QUERIES = {
  RESTAURANT: `
    nwr["amenity"="restaurant"]["name"](around:${RADIUS},{lat},{lng});
  `,
  BAR: `
    nwr["amenity"="bar"]["name"](around:${RADIUS},{lat},{lng});
    nwr["amenity"="pub"]["name"](around:${RADIUS},{lat},{lng});
    nwr["amenity"="nightclub"]["name"](around:${RADIUS},{lat},{lng});
  `,
  CAFE: `
    nwr["amenity"="cafe"]["name"](around:${RADIUS},{lat},{lng});
  `,
  ATTRACTION: `
    nwr["tourism"="attraction"]["name"](around:${RADIUS},{lat},{lng});
    nwr["tourism"="viewpoint"]["name"](around:${RADIUS},{lat},{lng});
    nwr["historic"]["name"](around:${RADIUS},{lat},{lng});
    nwr["amenity"="theatre"]["name"](around:${RADIUS},{lat},{lng});
  `,
  MUSEUM: `
    nwr["tourism"="museum"]["name"](around:${RADIUS},{lat},{lng});
    nwr["tourism"="gallery"]["name"](around:${RADIUS},{lat},{lng});
  `,
  NATURE: `
    nwr["leisure"="park"]["name"](around:${RADIUS},{lat},{lng});
    nwr["leisure"="nature_reserve"]["name"](around:${RADIUS},{lat},{lng});
    nwr["natural"="beach"]["name"](around:${RADIUS},{lat},{lng});
  `,
  HOTEL: `
    nwr["tourism"="hotel"]["name"](around:${RADIUS},{lat},{lng});
  `,
};

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Rate limiting: 2 seconds between requests to be respectful
const RATE_LIMIT_DELAY = 2000;
let lastRequestTime = 0;

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function rateLimitedFetch(url: string, options: RequestInit, retries = 3): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    await delay(RATE_LIMIT_DELAY - timeSinceLastRequest);
  }

  lastRequestTime = Date.now();

  try {
    const response = await fetch(url, options);

    // If we get a server error, retry with backoff
    if (!response.ok && retries > 0) {
      const backoff = (4 - retries) * 3000; // 3s, 6s, 9s
      console.log(`    Server error ${response.status}, retrying in ${backoff/1000}s...`);
      await delay(backoff);
      return rateLimitedFetch(url, options, retries - 1);
    }

    return response;
  } catch (error) {
    if (retries > 0) {
      const backoff = (4 - retries) * 3000;
      console.log(`    Network error, retrying in ${backoff/1000}s...`);
      await delay(backoff);
      return rateLimitedFetch(url, options, retries - 1);
    }
    throw error;
  }
}

export async function queryOverpass(
  lat: number,
  lng: number,
  queryTemplate: string,
  limit: number = 50
): Promise<OSMElement[]> {
  // Replace placeholders in query
  const query = queryTemplate
    .replace(/{lat}/g, lat.toString())
    .replace(/{lng}/g, lng.toString());

  // Build full Overpass QL query with shorter timeout
  const fullQuery = `
    [out:json][timeout:30];
    (
      ${query}
    );
    out center ${limit};
  `;

  const response = await rateLimitedFetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `data=${encodeURIComponent(fullQuery)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Filter to only elements with names
  const elements = (data.elements || []).filter(
    (el: OSMElement) => el.tags?.name
  );

  return elements;
}

export function normalizePlace(element: OSMElement): NormalizedPlace | null {
  const tags = element.tags || {};

  // Get coordinates (nodes have lat/lon directly, ways/relations have center)
  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;

  if (!lat || !lng || !tags.name) {
    return null;
  }

  // Build address from available tags
  const addressParts: string[] = [];
  if (tags['addr:housenumber'] && tags['addr:street']) {
    addressParts.push(`${tags['addr:housenumber']} ${tags['addr:street']}`);
  } else if (tags['addr:street']) {
    addressParts.push(tags['addr:street']);
  }
  if (tags['addr:city']) {
    addressParts.push(tags['addr:city']);
  }
  if (tags['addr:state']) {
    addressParts.push(tags['addr:state']);
  }
  if (tags['addr:postcode']) {
    addressParts.push(tags['addr:postcode']);
  }

  // Build categories from relevant tags
  const categories: string[] = [];
  if (tags.amenity) categories.push(tags.amenity);
  if (tags.tourism) categories.push(tags.tourism);
  if (tags.leisure) categories.push(tags.leisure);
  if (tags.shop) categories.push(tags.shop);
  if (tags.cuisine) categories.push(...tags.cuisine.split(';').map(c => c.trim()));
  if (tags.historic) categories.push('historic', tags.historic);

  return {
    id: `${element.type}/${element.id}`,
    source: 'openstreetmap',
    name: tags.name,
    address: addressParts.length > 0 ? addressParts.join(', ') : null,
    lat,
    lng,
    description: tags.description || null,
    website: tags.website || tags['contact:website'] || null,
    phone: tags.phone || tags['contact:phone'] || null,
    hours: tags.opening_hours || null,
    priceLevel: null, // OSM doesn't have price levels
    categories,
    rating: null, // OSM doesn't have ratings
  };
}

export async function fetchRestaurants(lat: number, lng: number, limit: number = 30): Promise<NormalizedPlace[]> {
  const elements = await queryOverpass(lat, lng, OSM_QUERIES.RESTAURANT, limit * 2);
  return elements
    .map(normalizePlace)
    .filter((p): p is NormalizedPlace => p !== null)
    .slice(0, limit);
}

export async function fetchBars(lat: number, lng: number, limit: number = 15): Promise<NormalizedPlace[]> {
  const elements = await queryOverpass(lat, lng, OSM_QUERIES.BAR, limit * 2);
  return elements
    .map(normalizePlace)
    .filter((p): p is NormalizedPlace => p !== null)
    .slice(0, limit);
}

export async function fetchCafes(lat: number, lng: number, limit: number = 10): Promise<NormalizedPlace[]> {
  const elements = await queryOverpass(lat, lng, OSM_QUERIES.CAFE, limit * 2);
  return elements
    .map(normalizePlace)
    .filter((p): p is NormalizedPlace => p !== null)
    .slice(0, limit);
}

export async function fetchAttractions(lat: number, lng: number, limit: number = 20): Promise<NormalizedPlace[]> {
  const elements = await queryOverpass(lat, lng, OSM_QUERIES.ATTRACTION, limit * 2);
  return elements
    .map(normalizePlace)
    .filter((p): p is NormalizedPlace => p !== null)
    .slice(0, limit);
}

export async function fetchMuseums(lat: number, lng: number, limit: number = 10): Promise<NormalizedPlace[]> {
  const elements = await queryOverpass(lat, lng, OSM_QUERIES.MUSEUM, limit * 2);
  return elements
    .map(normalizePlace)
    .filter((p): p is NormalizedPlace => p !== null)
    .slice(0, limit);
}

export async function fetchParks(lat: number, lng: number, limit: number = 10): Promise<NormalizedPlace[]> {
  const elements = await queryOverpass(lat, lng, OSM_QUERIES.NATURE, limit * 2);
  return elements
    .map(normalizePlace)
    .filter((p): p is NormalizedPlace => p !== null)
    .slice(0, limit);
}

export async function fetchHotels(lat: number, lng: number, limit: number = 5): Promise<NormalizedPlace[]> {
  const elements = await queryOverpass(lat, lng, OSM_QUERIES.HOTEL, limit * 2);
  return elements
    .map(normalizePlace)
    .filter((p): p is NormalizedPlace => p !== null)
    .slice(0, limit);
}
