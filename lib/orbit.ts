import {
  propagate,
  gstime,
  eciToGeodetic,
  degreesLat,
  degreesLong,
} from 'satellite.js';
import type { TLEData } from '@/types/satellite';
import { EARTH_RADIUS_KM } from '@/lib/constants';
import { getCachedSatrec } from '@/lib/sgp4';

export interface OrbitPoint {
  lat: number;
  lng: number;
  alt: number; // normalized to Earth radii (for globe.gl)
}

export interface TrackPoint extends OrbitPoint {
  altKm: number;
  t: number; // epoch ms of this sample
}

/**
 * Ground track around an arbitrary moment in time — both past and future.
 * Unlike computeOrbitPath (which only trails behind "now"), this is what the
 * time scrubber rides along: `backSec` before `centerMs` and `fwdSec` after it.
 * Sample times are returned so callers can split past/future and interpolate.
 */
export function computeGroundTrack(
  tle: TLEData,
  centerMs: number,
  backSec: number,
  fwdSec: number,
  stepSec: number = 30,
): TrackPoint[] {
  if (stepSec <= 0 || backSec < 0 || fwdSec < 0) return [];

  const satrec = getCachedSatrec(tle);
  const points: TrackPoint[] = [];
  const startMs = centerMs - backSec * 1000;
  const steps = Math.round((backSec + fwdSec) / stepSec);

  for (let i = 0; i <= steps; i++) {
    const tMs = startMs + i * stepSec * 1000;
    const date = new Date(tMs);
    const posVel = propagate(satrec, date);
    if (!posVel.position || typeof posVel.position === 'boolean') continue;

    const gd = eciToGeodetic(posVel.position, gstime(date));
    const altKm = gd.height;
    points.push({
      lat: degreesLat(gd.latitude),
      lng: degreesLong(gd.longitude),
      alt: altKm / EARTH_RADIUS_KM,
      altKm,
      t: tMs,
    });
  }

  return points;
}

/**
 * Compute an orbit trail for a satellite.
 * Returns points sampled from the past up to slightly after startDate,
 * covering `fraction` of one orbital period (default 0.50).
 * The trail shows where the satellite has been — it extends behind,
 * not ahead. 50% gives a clear half-orbit arc trailing behind.
 */
export function computeOrbitPath(
  tle: TLEData,
  startDate: Date,
  steps: number = 180,
  fraction: number = 0.50,
): OrbitPoint[] {
  // Mean motion (revs/day) is in TLE line 2, columns 53-63
  const meanMotion = parseFloat(tle.line2.substring(52, 63).trim());
  if (meanMotion <= 0) return [];

  const periodSeconds = 86400 / meanMotion;
  const durationSeconds = periodSeconds * fraction;
  // Trail ends at startDate (now) — no forward buffer
  const originMs = startDate.getTime() - durationSeconds * 1000;

  const satrec = getCachedSatrec(tle);
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
