import { EARTH_RADIUS_KM } from './constants';

export type OrbitType = 'LEO' | 'MEO' | 'GEO' | 'HEO';

export interface OrbitalParams {
  inclination: number;
  eccentricity: number;
  raan: number;
  argPerigee: number;
  meanAnomaly: number;
  meanMotion: number;
  period: number;
  semiMajorAxis: number;
  apogee: number;
  perigee: number;
  epoch: Date;
  bstar: number;
  orbitType: OrbitType;
}

/** Standard gravitational parameter for Earth (km^3/s^2) */
const GM = 398600.4418;

function classifyOrbit(period: number, eccentricity: number): OrbitType {
  if (eccentricity > 0.25) return 'HEO';
  if (period < 128) return 'LEO';
  if (period >= 1400 && period <= 1500) return 'GEO';
  return 'MEO';
}

function parseBstar(line1: string): number {
  try {
    const raw = line1.substring(53, 61).trim();
    if (!raw || raw.length < 2) return 0;
    // Format: ±NNNNN±E  e.g. " 12345-4" means 0.12345e-4
    const mantissa = parseFloat(raw.substring(0, raw.length - 2)) * 1e-5;
    const exp = parseInt(raw.substring(raw.length - 2));
    if (isNaN(mantissa) || isNaN(exp)) return 0;
    return mantissa * Math.pow(10, exp);
  } catch {
    return 0;
  }
}

function parseEpoch(line1: string): Date {
  const yy = parseInt(line1.substring(18, 20));
  const year = yy >= 57 ? 1900 + yy : 2000 + yy;
  const dayFrac = parseFloat(line1.substring(20, 32));
  const epoch = new Date(Date.UTC(year, 0, 1));
  epoch.setTime(epoch.getTime() + (dayFrac - 1) * 86400000);
  return epoch;
}

export function parseOrbitalParams(line1: string, line2: string): OrbitalParams {
  const inclination = parseFloat(line2.substring(8, 16).trim());
  const raan = parseFloat(line2.substring(17, 25).trim());
  const eccentricity = parseFloat('0.' + line2.substring(26, 33).trim());
  const argPerigee = parseFloat(line2.substring(34, 42).trim());
  const meanAnomaly = parseFloat(line2.substring(43, 51).trim());
  const meanMotion = parseFloat(line2.substring(52, 63).trim());

  const epoch = parseEpoch(line1);
  const bstar = parseBstar(line1);

  // Period in minutes
  const period = 1440 / meanMotion;

  // Semi-major axis via Kepler's third law: T = 2π√(a³/GM)
  const periodSeconds = period * 60;
  const semiMajorAxis = Math.pow(
    GM * Math.pow(periodSeconds / (2 * Math.PI), 2),
    1 / 3,
  );

  const apogee = semiMajorAxis * (1 + eccentricity) - EARTH_RADIUS_KM;
  const perigee = semiMajorAxis * (1 - eccentricity) - EARTH_RADIUS_KM;
  const orbitType = classifyOrbit(period, eccentricity);

  return {
    inclination,
    eccentricity,
    raan,
    argPerigee,
    meanAnomaly,
    meanMotion,
    period,
    semiMajorAxis,
    apogee,
    perigee,
    epoch,
    bstar,
    orbitType,
  };
}
