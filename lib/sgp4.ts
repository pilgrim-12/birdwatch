import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  degreesLat,
  degreesLong,
} from 'satellite.js';
import type { SatellitePosition, TLEData } from '@/types/satellite';

// TODO: Move propagation to a Web Worker for better performance with large satellite sets.
// This will be needed especially for groups like 'starlink' and 'active' with thousands of satellites.

export function propagateSatellite(tle: TLEData, date: Date): SatellitePosition | null {
  try {
    const satrec = twoline2satrec(tle.line1, tle.line2);
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
