import { NextRequest, NextResponse } from 'next/server';

interface ParsedLocation {
  name: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  placeId: string | null;
}

// Follow redirects to get the final URL (for short URLs like maps.app.goo.gl)
async function resolveShortUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
    });
    return response.url;
  } catch {
    // If HEAD fails, try GET
    const response = await fetch(url, {
      redirect: 'follow',
    });
    return response.url;
  }
}

// Parse coordinates from URL like /@40.7128,-74.0060,17z
function parseCoordinates(url: string): { lat: number; lng: number } | null {
  // Pattern: /@lat,lng or @lat,lng
  const coordMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // Also try query params like ?q=lat,lng
  const queryMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (queryMatch) {
    const lat = parseFloat(queryMatch[1]);
    const lng = parseFloat(queryMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  return null;
}

// Parse place name from URL
function parsePlaceName(url: string): string | null {
  // Pattern: /place/Place+Name/ or /place/Place%20Name/
  const placeMatch = url.match(/\/place\/([^/@]+)/);
  if (placeMatch) {
    // Decode URL encoding and replace + with spaces
    let name = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
    // Clean up common patterns
    name = name.replace(/,\s*$/, '').trim();
    if (name.length > 0 && name.length < 200) {
      return name;
    }
  }

  // Try search query
  const searchMatch = url.match(/\/search\/([^/@?]+)/);
  if (searchMatch) {
    let name = decodeURIComponent(searchMatch[1].replace(/\+/g, ' '));
    name = name.replace(/,\s*$/, '').trim();
    if (name.length > 0 && name.length < 200) {
      return name;
    }
  }

  return null;
}

// Parse address - often the place name in Google Maps URLs includes address
function parseAddress(url: string, placeName: string | null): string | null {
  // The place name often IS the address in Google Maps
  // Try to extract a more complete address from the data parameter
  const dataMatch = url.match(/!3s([^!]+)/);
  if (dataMatch) {
    try {
      const decoded = decodeURIComponent(dataMatch[1]);
      if (decoded.includes(',') && decoded.length > 10) {
        return decoded;
      }
    } catch {
      // Ignore decode errors
    }
  }

  // Use place name as fallback if it looks like an address
  if (placeName && (placeName.includes(',') || /\d+/.test(placeName))) {
    return placeName;
  }

  return null;
}

// Extract Place ID if present
function parsePlaceId(url: string): string | null {
  // Pattern: place_id:... or !1s... in data parameter
  const placeIdMatch = url.match(/place_id[=:]([^&]+)/);
  if (placeIdMatch) {
    return placeIdMatch[1];
  }

  // ChIJ format place IDs in data params
  const chiMatch = url.match(/!1s(ChIJ[^!&]+)/);
  if (chiMatch) {
    return chiMatch[1];
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate it's a Google Maps URL
    const validDomains = [
      'google.com/maps',
      'maps.google.com',
      'goo.gl/maps',
      'maps.app.goo.gl',
    ];

    const isValidUrl = validDomains.some(domain => url.includes(domain));
    if (!isValidUrl) {
      return NextResponse.json(
        { error: 'Please provide a valid Google Maps URL' },
        { status: 400 }
      );
    }

    // Resolve short URLs
    let resolvedUrl = url;
    if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
      resolvedUrl = await resolveShortUrl(url);
    }

    // Parse the URL
    const coordinates = parseCoordinates(resolvedUrl);
    const name = parsePlaceName(resolvedUrl);
    const address = parseAddress(resolvedUrl, name);
    const placeId = parsePlaceId(resolvedUrl);

    const result: ParsedLocation = {
      name,
      latitude: coordinates?.lat ?? null,
      longitude: coordinates?.lng ?? null,
      address,
      placeId,
    };

    // Check if we got useful data
    if (!result.latitude && !result.name) {
      return NextResponse.json(
        {
          error: 'Could not extract location data from URL. Try copying the full URL from your browser address bar.',
          parsedUrl: resolvedUrl,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      location: result,
      resolvedUrl,
    });

  } catch (error) {
    console.error('Error parsing Google Maps URL:', error);
    return NextResponse.json(
      { error: 'Failed to parse URL. Please try again.' },
      { status: 500 }
    );
  }
}
