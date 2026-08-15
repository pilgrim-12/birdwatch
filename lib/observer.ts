import {
  propagate,
  gstime,
  eciToEcf,
  ecfToLookAngles,
  degreesToRadians,
} from 'satellite.js';
import type { ObserverLocation, LookAngles, TLEData } from '@/types/satellite';
import { getCachedSatrec } from '@/lib/sgp4';

export function calculateLookAngles(
  tle: TLEData,
  observer: ObserverLocation,
  date: Date,
): LookAngles | null {
  try {
    const satrec = getCachedSatrec(tle);
    const positionAndVelocity = propagate(satrec, date);

    if (typeof positionAndVelocity.position === 'boolean') {
      return null;
    }

    const positionEci = positionAndVelocity.position;
    const gmst = gstime(date);
    const positionEcf = eciToEcf(positionEci, gmst);

    const observerGd = {
      longitude: degreesToRadians(observer.lng),
      latitude: degreesToRadians(observer.lat),
      height: observer.alt / 1000, // meters to km
    };

    const angles = ecfToLookAngles(observerGd, positionEcf);

    return {
      azimuth: Number(angles.azimuth) * (180 / Math.PI),
      elevation: Number(angles.elevation) * (180 / Math.PI),
      rangeSat: Number(angles.rangeSat),
    };
  } catch {
    return null;
  }
}
