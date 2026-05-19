import {
  twoline2satrec,
  propagate,
  gstime,
  eciToEcf,
  ecfToLookAngles,
  degreesToRadians,
} from 'satellite.js';
import type { TLEData, ObserverLocation } from '@/types/satellite';

export interface SatellitePass {
  satId: number;
  satName: string;
  startTime: Date;
  peakTime: Date;
  endTime: Date;
  peakElevation: number; // degrees
}

function getElevation(
  satrec: ReturnType<typeof twoline2satrec>,
  observerGd: { longitude: number; latitude: number; height: number },
  date: Date,
): number | null {
  const posVel = propagate(satrec, date);
  if (typeof posVel.position === 'boolean') return null;

  const gmst = gstime(date);
  const ecf = eciToEcf(posVel.position, gmst);
  const angles = ecfToLookAngles(observerGd, ecf);

  return Number(angles.elevation) * (180 / Math.PI);
}

/**
 * Find upcoming satellite passes over an observer location.
 * Scans the next `hoursAhead` hours in 30-second steps.
 */
export function findPasses(
  satellites: { id: number; name: string; tle: TLEData }[],
  observer: ObserverLocation,
  hoursAhead: number = 24,
  minElevation: number = 0,
): SatellitePass[] {
  const passes: SatellitePass[] = [];
  const stepMs = 30_000; // 30 seconds
  const now = Date.now();
  const endMs = now + hoursAhead * 3_600_000;

  const observerGd = {
    longitude: degreesToRadians(observer.lng),
    latitude: degreesToRadians(observer.lat),
    height: observer.alt / 1000,
  };

  for (const sat of satellites) {
    let satrec: ReturnType<typeof twoline2satrec>;
    try {
      satrec = twoline2satrec(sat.tle.line1, sat.tle.line2);
    } catch {
      continue;
    }

    let inPass = false;
    let passStart = new Date();
    let peakEl = 0;
    let peakTime = new Date();

    for (let t = now; t <= endMs; t += stepMs) {
      const date = new Date(t);
      const el = getElevation(satrec, observerGd, date);
      if (el === null) continue;

      if (el > minElevation) {
        if (!inPass) {
          inPass = true;
          passStart = date;
          peakEl = el;
          peakTime = date;
        }
        if (el > peakEl) {
          peakEl = el;
          peakTime = date;
        }
      } else if (inPass) {
        inPass = false;
        const durationMin = (date.getTime() - passStart.getTime()) / 60_000;
        // Skip GEO/always-visible satellites (no real pass exceeds 60 min)
        if (peakEl >= 5 && durationMin <= 60) {
          passes.push({
            satId: sat.id,
            satName: sat.name,
            startTime: passStart,
            peakTime,
            endTime: date,
            peakElevation: peakEl,
          });
        }
      }
    }

    // Handle pass that extends beyond the search window — skip if too long (GEO)
    if (inPass && peakEl >= 5) {
      const durationMin = (endMs - passStart.getTime()) / 60_000;
      if (durationMin <= 60) {
        passes.push({
          satId: sat.id,
          satName: sat.name,
          startTime: passStart,
          peakTime,
          endTime: new Date(endMs),
          peakElevation: peakEl,
        });
      }
    }
  }

  passes.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  return passes;
}

/** Compute current elevation (degrees) of a satellite from an observer. */
export function getCurrentElevation(
  tle: TLEData,
  observer: ObserverLocation,
  date: Date = new Date(),
): number | null {
  try {
    const satrec = twoline2satrec(tle.line1, tle.line2);
    const observerGd = {
      longitude: degreesToRadians(observer.lng),
      latitude: degreesToRadians(observer.lat),
      height: observer.alt / 1000,
    };
    return getElevation(satrec, observerGd, date);
  } catch {
    return null;
  }
}
