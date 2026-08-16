import {
  twoline2satrec,
  propagate,
  gstime,
  eciToEcf,
  ecfToLookAngles,
  degreesToRadians,
} from 'satellite.js';
import type { TLEData, ObserverLocation } from '@/types/satellite';
import { getCachedSatrec } from '@/lib/sgp4';

const SPEED_OF_LIGHT_KM_S = 299_792.458;

/**
 * Compute the range rate (km/s) between observer and satellite at a given time.
 * Positive = satellite receding, negative = approaching.
 */
function getRangeRate(
  satrec: ReturnType<typeof twoline2satrec>,
  observerGd: { longitude: number; latitude: number; height: number },
  date: Date,
): number | null {
  const dt = 500; // ms (±0.5s finite difference)
  const t1 = new Date(date.getTime() - dt);
  const t2 = new Date(date.getTime() + dt);

  function getRange(d: Date): number | null {
    const posVel = propagate(satrec, d);
    if (typeof posVel.position === 'boolean') return null;
    const gmst = gstime(d);
    const ecf = eciToEcf(posVel.position, gmst);
    const angles = ecfToLookAngles(observerGd, ecf);
    return angles.rangeSat as number; // km
  }

  const r1 = getRange(t1);
  const r2 = getRange(t2);
  if (r1 === null || r2 === null) return null;

  return (r2 - r1) / (2 * dt / 1000); // km/s
}

/**
 * Compute the maximum absolute Doppler shift (Hz) during a satellite pass.
 * Samples range rate at multiple points and returns the peak |Δf|.
 */
export function computeMaxDoppler(
  tle: TLEData,
  observer: ObserverLocation,
  passStartMs: number,
  passEndMs: number,
  frequencyHz: number,
): number {
  try {
    const satrec = getCachedSatrec(tle);
    const observerGd = {
      longitude: degreesToRadians(observer.lng),
      latitude: degreesToRadians(observer.lat),
      height: observer.alt / 1000,
    };

    const duration = passEndMs - passStartMs;
    const steps = 10;
    let maxAbsDoppler = 0;

    for (let i = 0; i <= steps; i++) {
      const t = new Date(passStartMs + (duration * i) / steps);
      const rangeRate = getRangeRate(satrec, observerGd, t);
      if (rangeRate === null) continue;

      // Δf = -f0 × v_r / c (negative because approaching = positive Doppler)
      const doppler = Math.abs(frequencyHz * rangeRate / SPEED_OF_LIGHT_KM_S);
      if (doppler > maxAbsDoppler) maxAbsDoppler = doppler;
    }

    return maxAbsDoppler;
  } catch {
    return 0;
  }
}

export interface DopplerSample {
  t: number; // epoch ms
  shiftHz: number; // signed: positive while approaching
}

/**
 * Doppler shift over the course of a pass — the classic S-curve that tells an
 * operator how far to retune before, at, and after TCA.
 */
export function computeDopplerSeries(
  tle: TLEData,
  observer: ObserverLocation,
  passStartMs: number,
  passEndMs: number,
  frequencyHz: number,
  steps: number = 40,
): DopplerSample[] {
  try {
    const satrec = getCachedSatrec(tle);
    const observerGd = {
      longitude: degreesToRadians(observer.lng),
      latitude: degreesToRadians(observer.lat),
      height: observer.alt / 1000,
    };

    const duration = passEndMs - passStartMs;
    const out: DopplerSample[] = [];
    for (let i = 0; i <= steps; i++) {
      const tMs = passStartMs + (duration * i) / steps;
      const rangeRate = getRangeRate(satrec, observerGd, new Date(tMs));
      if (rangeRate === null) continue;
      out.push({ t: tMs, shiftHz: (-frequencyHz * rangeRate) / SPEED_OF_LIGHT_KM_S });
    }
    return out;
  } catch {
    return [];
  }
}
