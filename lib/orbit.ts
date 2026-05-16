import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  degreesLat,
  degreesLong,
} from 'satellite.js';
import type { TLEData } from '@/types/satellite';
import { EARTH_RADIUS_KM } from '@/lib/constants';

export interface OrbitPoint {
  lat: number;
  lng: number;
  alt: number; // normalized to Earth radii (for globe.gl)
}

/**
 * Compute one full orbit path for a satellite.
 * Returns an array of lat/lng/alt points sampled over one orbital period.
 */
export function computeOrbitPath(
  tle: TLEData,
  startDate: Date,
  steps: number = 180,
): OrbitPoint[] {
  // Mean motion (revs/day) is in TLE line 2, columns 53-63
  const meanMotion = parseFloat(tle.line2.substring(52, 63).trim());
  if (meanMotion <= 0) return [];

  const periodSeconds = 86400 / meanMotion;
  const satrec = twoline2satrec(tle.line1, tle.line2);
  const points: OrbitPoint[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = new Date(startDate.getTime() + (i / steps) * periodSeconds * 1000);
    const posVel = propagate(satrec, t);

    if (typeof posVel.position === 'boolean') continue;

    const gmst = gstime(t);
    const gd = eciToGeodetic(posVel.position, gmst);

    points.push({
      lat: degreesLat(gd.latitude),
      lng: degreesLong(gd.longitude),
      alt: gd.height / EARTH_RADIUS_KM,
    });
  }

  return points;
}
