import { NextRequest, NextResponse } from 'next/server';

interface ParsedLocation {
  name: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  country: string | null;
  placeId: string | null;
}

interface MapboxFeature {
  place_type: string[];
  place_name: string;
  text: string;
  context?: Array<{ id: string; text: string }>;
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

// Parse coordinates - prioritize !3d/!4d data params (exact location) over @ (viewport)
function parseCoordinates(url: string): { lat: number; lng: number } | null {
  // First try !3d (latitude) and !4d (longitude) from data params - these are exact place coords
  const latMatch = url.match(/!3d(-?\d+\.?\d*)/);
  const lngMatch = url.match(/!4d(-?\d+\.?\d*)/);

  if (latMatch && lngMatch) {
    const lat = parseFloat(latMatch[1]);
    const lng = parseFloat(lngMatch[1]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // Fallback to /@lat,lng (viewport center, less accurate)
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
    try {
      // Decode URL encoding and replace + with spaces
      let name = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
      // Clean up common patterns
      name = name.replace(/,\s*$/, '').trim();
      if (name.length > 0 && name.length < 200) {
        return name;
      }
    } catch {
      // If decode fails, try without decoding
      const name = placeMatch[1].replace(/\+/g, ' ').trim();
      if (name.length > 0 && name.length < 200) {
        return name;
      }
    }
  }

  // Try search query
  const searchMatch = url.match(/\/search\/([^/@?]+)/);
  if (searchMatch) {
    try {
      let name = decodeURIComponent(searchMatch[1].replace(/\+/g, ' '));
      name = name.replace(/,\s*$/, '').trim();
      if (name.length > 0 && name.length < 200) {
        return name;
      }
    } catch {
      const name = searchMatch[1].replace(/\+/g, ' ').trim();
      if (name.length > 0 && name.length < 200) {
        return name;
      }
    }
  }

  return null;
}

// Extract Place ID if present
function parsePlaceId(url: string): string | null {
  // Hex format place IDs: !1s0x89c6c880240c3fff:0xf3b3e2101f5adf24
  const hexMatch = url.match(/!1s(0x[a-f0-9]+:0x[a-f0-9]+)/i);
  if (hexMatch) {
    return hexMatch[1];
  }

  // ChIJ format place IDs
  const chiMatch = url.match(/!1s(ChIJ[^!&]+)/);
  if (chiMatch) {
    return chiMatch[1];
  }

  // Query param format
  const placeIdMatch = url.match(/place_id[=:]([^&]+)/);
  if (placeIdMatch) {
    return placeIdMatch[1];
  }

  return null;
}

// Reverse geocode using Mapbox to get address from coordinates
async function reverseGeocode(lat: number, lng: number): Promise<{
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  country: string | null;
}> {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!mapboxToken) {
    console.warn('Mapbox token not configured for reverse geocoding');
    return { address: null, neighborhood: null, city: null, country: null };
  }

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=address,neighborhood,place,country`
    );

    if (!response.ok) {
      console.error('Mapbox reverse geocoding failed:', response.status);
      return { address: null, neighborhood: null, city: null, country: null };
    }

    const data = await response.json();
    const features: MapboxFeature[] = data.features || [];

    let address: string | null = null;
    let neighborhood: string | null = null;
    let city: string | null = null;
    let country: string | null = null;

    for (const feature of features) {
      const placeType = feature.place_type[0];

      if (placeType === 'address' && !address) {
        // Get just the street address part, not the full place_name
        address = feature.place_name;
      } else if (placeType === 'neighborhood' && !neighborhood) {
        neighborhood = feature.text;
      } else if (placeType === 'place' && !city) {
        city = feature.text;
      } else if (placeType === 'country' && !country) {
        country = feature.text;
      }
    }

    // If no address found but we have features, construct from first result
    if (!address && features.length > 0) {
      address = features[0].place_name;
    }

    // Try to extract city/country from context if not found
    if (features.length > 0 && features[0].context) {
      for (const ctx of features[0].context) {
        if (ctx.id.startsWith('place.') && !city) {
          city = ctx.text;
        } else if (ctx.id.startsWith('country.') && !country) {
          country = ctx.text;
        } else if (ctx.id.startsWith('neighborhood.') && !neighborhood) {
          neighborhood = ctx.text;
        }
      }
    }

    return { address, neighborhood, city, country };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return { address: null, neighborhood: null, city: null, country: null };
  }
}

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    const { url } = body;

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
    const placeId = parsePlaceId(resolvedUrl);

    // Reverse geocode to get address if we have coordinates
    let geoData = { address: null as string | null, neighborhood: null as string | null, city: null as string | null, country: null as string | null };
    if (coordinates) {
      try {
        geoData = await reverseGeocode(coordinates.lat, coordinates.lng);
      } catch (geoError) {
        console.error('Reverse geocoding failed, continuing without address:', geoError);
        // Continue without address data - don't fail the whole request
      }
    }

    const result: ParsedLocation = {
      name,
      latitude: coordinates?.lat ?? null,
      longitude: coordinates?.lng ?? null,
      address: geoData.address,
      neighborhood: geoData.neighborhood,
      city: geoData.city,
      country: geoData.country,
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to parse URL. Please try again.', details: errorMessage },
      { status: 500 }
    );
  }
}
