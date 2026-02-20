/**
 * Geocoding utilities for converting location names to coordinates
 * Uses Nominatim (OpenStreetMap) - free, no API key required
 */

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

/**
 * Geocode a location name to coordinates using Nominatim
 * Rate limit: 1 request per second (we'll add a small delay)
 */
export async function geocodeLocation(locationName: string): Promise<GeocodeResult | null> {
  try {
    // Clean up the location name
    const query = encodeURIComponent(locationName.trim());

    // Use Nominatim API
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
      {
        headers: {
          'User-Agent': 'Timeline-Viewer-App', // Required by Nominatim
        },
      }
    );

    if (!response.ok) {
      console.error('Geocoding request failed:', response.status);
      return null;
    }

    const results: NominatimResult[] = await response.json();

    if (results.length === 0) {
      console.warn('No geocoding results found for:', locationName);
      return null;
    }

    const result = results[0];
    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Add a small delay to respect Nominatim's rate limit (1 req/sec)
 */
export function geocodingDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 1100));
}
