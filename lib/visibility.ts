import { propagate, gstime, ecfToEci } from 'satellite.js';
import { getSunLatLng } from '@/lib/sun';
import { getCachedSatrec } from '@/lib/sgp4';
import { calculateLookAngles } from '@/lib/observer';
import { EARTH_RADIUS_KM } from '@/lib/constants';
import type { ObserverLocation, TLEData } from '@/types/satellite';

const DEG = Math.PI / 180;

/** Sun elevation above the horizon (degrees) at a point on Earth. */
export function sunElevation(lat: number, lng: number, date: Date): number {
  const sun = getSunLatLng(date);
  const phi = lat * DEG;
  const decl = sun.lat * DEG;
  const hourAngle = (lng - sun.lng) * DEG;
  const sinEl =
    Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(hourAngle);
  return Math.asin(Math.max(-1, Math.min(1, sinEl))) / DEG;
}

/** Unit vector towards the Sun in the ECI frame. */
function sunVectorEci(date: Date): { x: number; y: number; z: number } {
  const sun = getSunLatLng(date);
  const lat = sun.lat * DEG;
  const lng = sun.lng * DEG;
  const ecf = {
    x: Math.cos(lat) * Math.cos(lng),
    y: Math.cos(lat) * Math.sin(lng),
    z: Math.sin(lat),
  };
  return ecfToEci(ecf, gstime(date)) as { x: number; y: number; z: number };
}

/**
 * Is the satellite lit by the Sun? Uses the cylindrical shadow approximation:
 * a satellite behind Earth is eclipsed when its distance from the Earth-Sun
 * axis is smaller than Earth's radius.
 */
export function isSatelliteSunlit(tle: TLEData, date: Date): boolean | null {
  try {
    const posVel = propagate(getCachedSatrec(tle), date);
    if (!posVel.position || typeof posVel.position === 'boolean') return null;
    const r = posVel.position as { x: number; y: number; z: number };
    const s = sunVectorEci(date);

    const dot = r.x * s.x + r.y * s.y + r.z * s.z;
    if (dot > 0) return true; // sunward side of Earth — always lit

    // Perpendicular distance from the Earth-Sun axis
    const px = r.x - dot * s.x;
    const py = r.y - dot * s.y;
    const pz = r.z - dot * s.z;
    return Math.sqrt(px * px + py * py + pz * pz) > EARTH_RADIUS_KM;
  } catch {
    return null;
  }
}

export interface PassVisibility {
  /** Satellite is sunlit while the observer sits in darkness and it is high enough */
  visible: boolean;
  /** Window during which it is actually visible, if any */
  startTime: Date | null;
  endTime: Date | null;
  maxElevation: number;
  /** Why it is not visible, for the tooltip */
  reason: 'visible' | 'daylight' | 'eclipsed' | 'too-low';
}

const MIN_VISIBLE_ELEVATION = 10; // degrees — below this it is lost in haze/clutter
const TWILIGHT_SUN_ELEVATION = -6; // civil twilight at the observer

/**
 * Can this pass be seen with the naked eye? A satellite is visible when it is
 * sunlit, high enough above the horizon, and the observer is in twilight or night.
 */
export function computePassVisibility(
  tle: TLEData,
  observer: ObserverLocation,
  startTime: Date,
  endTime: Date,
  stepSec: number = 30,
): PassVisibility {
  const startMs = startTime.getTime();
  const endMs = endTime.getTime();
  const steps = Math.max(2, Math.ceil((endMs - startMs) / (stepSec * 1000)));

  let visStart: Date | null = null;
  let visEnd: Date | null = null;
  let maxElevation = 0;
  let sawDaylight = false;
  let sawEclipse = false;
  let sawHighEnough = false;

  for (let i = 0; i <= steps; i++) {
    const date = new Date(startMs + ((endMs - startMs) * i) / steps);
    const look = calculateLookAngles(tle, observer, date);
    if (!look) continue;
    if (look.elevation > maxElevation) maxElevation = look.elevation;
    if (look.elevation < MIN_VISIBLE_ELEVATION) continue;
    sawHighEnough = true;

    if (sunElevation(observer.lat, observer.lng, date) > TWILIGHT_SUN_ELEVATION) {
      sawDaylight = true;
      continue;
    }
    if (!isSatelliteSunlit(tle, date)) {
      sawEclipse = true;
      continue;
    }

    if (!visStart) visStart = date;
    visEnd = date;
  }

  if (visStart && visEnd) {
    return { visible: true, startTime: visStart, endTime: visEnd, maxElevation, reason: 'visible' };
  }

  let reason: PassVisibility['reason'] = 'too-low';
  if (!sawHighEnough) reason = 'too-low';
  else if (sawDaylight && !sawEclipse) reason = 'daylight';
  else if (sawEclipse) reason = 'eclipsed';

  return { visible: false, startTime: null, endTime: null, maxElevation, reason };
}
