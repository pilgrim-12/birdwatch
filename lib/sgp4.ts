import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  degreesLat,
  degreesLong,
} from 'satellite.js';
import type { SatRec } from 'satellite.js';
import type { SatellitePosition, TLEData } from '@/types/satellite';

// Cache satrec objects keyed by TLE lines — twoline2satrec is expensive
// and the same TLE is propagated many times between updates.
// Uses insertion-order eviction (Map preserves insertion order) to bound memory.
const MAX_CACHE_SIZE = 6000;
const satrecCache = new Map<string, SatRec>();

export function getCachedSatrec(tle: TLEData): SatRec {
  const key = tle.line1 + tle.line2;
  let rec = satrecCache.get(key);
  if (rec) {
    // Move to end (most recently used)
    satrecCache.delete(key);
    satrecCache.set(key, rec);
    return rec;
  }
  rec = twoline2satrec(tle.line1, tle.line2);
  satrecCache.set(key, rec);
  // Evict oldest entries if over limit
  if (satrecCache.size > MAX_CACHE_SIZE) {
    const it = satrecCache.keys();
    satrecCache.delete(it.next().value as string);
  }
  return rec;
}

export function propagateSatellite(tle: TLEData, date: Date): SatellitePosition | null {
  try {
    const satrec = getCachedSatrec(tle);
    const positionAndVelocity = propagate(satrec, date);

    if (
      typeof positionAndVelocity.position === 'boolean' ||
      typeof positionAndVelocity.velocity === 'boolean'
    ) {
      return null;
    }

    const positionEci = positionAndVelocity.position;
    const velocityEci = positionAndVelocity.velocity;

    const gmst = gstime(date);
    const positionGd = eciToGeodetic(positionEci, gmst);

    const lat = degreesLat(positionGd.latitude);
    const lng = degreesLong(positionGd.longitude);
    const alt = positionGd.height; // km

    const velocity = Math.sqrt(
      Number(velocityEci.x) ** 2 + Number(velocityEci.y) ** 2 + Number(velocityEci.z) ** 2,
    );

    return { lat, lng, alt, velocity };
  } catch {
    return null;
  }
}

export function propagateAll(
  satellites: { tle: TLEData; id: number }[],
  date: Date,
): Map<number, SatellitePosition> {
  const positions = new Map<number, SatellitePosition>();

  for (const sat of satellites) {
    const pos = propagateSatellite(sat.tle, date);
    if (pos) {
      positions.set(sat.id, pos);
    }
  }

  return positions;
}
