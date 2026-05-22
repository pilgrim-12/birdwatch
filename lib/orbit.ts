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
 * Compute an orbit path for a satellite.
 * Returns points sampled from slightly before startDate forward,
 * covering `fraction` of one orbital period (default 0.85).
 * The gap at the end makes the orbit direction visually clear.
 */
export function computeOrbitPath(
  tle: TLEData,
  startDate: Date,
  steps: number = 180,
  fraction: number = 0.85,
): OrbitPoint[] {
  // Mean motion (revs/day) is in TLE line 2, columns 53-63
  const meanMotion = parseFloat(tle.line2.substring(52, 63).trim());
  if (meanMotion <= 0) return [];

  const periodSeconds = 86400 / meanMotion;
  // Start 5% of period before startDate so satellite stays on the path
  // even if the orbit is a few minutes stale
  const offsetMs = periodSeconds * 0.05 * 1000;
  const originMs = startDate.getTime() - offsetMs;
  const durationSeconds = periodSeconds * fraction;

  const satrec = twoline2satrec(tle.line1, tle.line2);
  const points: OrbitPoint[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = new Date(originMs + (i / steps) * durationSeconds * 1000);
    const posVel = propagate(satrec, t);

    if (!posVel.position || typeof posVel.position === 'boolean') continue;

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
