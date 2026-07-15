import "server-only";

/**
 * Distance-based auto-approval (see lib/booking/create.ts): bookings from
 * guests further than APPROVAL_RADIUS_MILES from the property auto-approve
 * (and capture payment immediately); closer ones still need the host's
 * manual approval, same as before this feature existed.
 */
export const APPROVAL_RADIUS_MILES = 20;

// 2A Kingston Road, Newport, NP19 0BP — geocoded once via postcodes.io, not
// looked up per booking since the property obviously doesn't move.
const PROPERTY_COORDS = { lat: 51.587971, lng: -2.982503 };

export type Coords = { lat: number; lng: number };

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle (haversine) distance in miles between two points. */
export function milesBetween(a: Coords, b: Coords): number {
  const EARTH_RADIUS_MILES = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function milesFromProperty(point: Coords): number {
  return milesBetween(PROPERTY_COORDS, point);
}

export interface GeocodingProvider {
  readonly name: string;
  /** Resolves a free-text address to coordinates, or null if it couldn't be resolved. */
  geocode(address: string): Promise<Coords | null>;
}

/** No token configured — every address is "unresolved" (see create.ts: treated as far away). */
class MockGeocoding implements GeocodingProvider {
  readonly name = "mock";
  async geocode(): Promise<Coords | null> {
    return null;
  }
}

// Mapbox returns its best guess even for gibberish input rather than an
// empty result — e.g. "asdkjaskdjaskjd nonexistent place 12345" matched a
// street in Montreal at relevance 0.5, purely because "12345" happened to
// look like a house number. Real full addresses scored 0.85-1.0 in testing;
// garbage/placeholder-like text scored 0.35-0.55. Below this, treat it as
// unresolved (see create.ts: unresolved defaults to auto-approve).
const MIN_RELEVANCE = 0.7;

class MapboxGeocoding implements GeocodingProvider {
  readonly name = "mapbox";
  constructor(private readonly token: string) {}

  async geocode(address: string): Promise<Coords | null> {
    // Biases (doesn't restrict) ambiguous/under-specified matches toward the
    // property's own location — e.g. an address with no city/country ends up
    // resolved nearby instead of confidently matching the wrong country on
    // the other side of the world, which is the safer failure direction
    // here (triggers manual review instead of a false auto-approval).
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${this.token}&limit=1&proximity=${PROPERTY_COORDS.lng},${PROPERTY_COORDS.lat}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
      if (!res.ok) return null;
      const data = await res.json();
      const feature = data?.features?.[0];
      if (!feature || typeof feature.relevance !== "number" || feature.relevance < MIN_RELEVANCE) return null;
      const center = feature.center;
      if (!Array.isArray(center) || center.length !== 2) return null;
      const [lng, lat] = center;
      if (typeof lat !== "number" || typeof lng !== "number") return null;
      return { lat, lng };
    } catch (err) {
      console.error("Mapbox geocoding failed:", err);
      return null;
    }
  }
}

export function getGeocodingProvider(): GeocodingProvider {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  return token ? new MapboxGeocoding(token) : new MockGeocoding();
}
