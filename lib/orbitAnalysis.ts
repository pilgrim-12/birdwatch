import { EARTH_RADIUS_KM } from '@/lib/constants';
import { haversineDistance } from '@/lib/flatMapMath';

export interface CpaResult {
  closest: { lat: number; lng: number; alt: number };
  distKm: number;
  midLat: number;
  midLng: number;
  midAlt: number;
}

/**
 * Compute the Closest Point of Approach (CPA) on an orbit path to the observer.
 * Returns the closest orbit point, distance in km, and the midpoint for labels.
 */
export function computeCPA(
  observer: { lat: number; lng: number },
  orbitPoints: { lat: number; lng: number; alt: number }[],
): CpaResult | null {
  if (orbitPoints.length === 0) return null;

  let minDist = Infinity;
  let closest = orbitPoints[0];
  for (const pt of orbitPoints) {
    const d = haversineDistance(observer.lat, observer.lng, pt.lat, pt.lng);
    if (d < minDist) { minDist = d; closest = pt; }
  }
  const distKm = Math.round(minDist * EARTH_RADIUS_KM);
  return {
    closest,
    distKm,
    midLat: (observer.lat + closest.lat) / 2,
    midLng: (observer.lng + closest.lng) / 2,
    midAlt: closest.alt / 2,
  };
}

export interface SlantRangeResult {
  lat: number;
  lng: number;
  alt: number;
  slantKm: number;
  midLat: number;
  midLng: number;
  midAlt: number;
}

/**
 * Compute the slant range (3D straight-line distance) from observer to satellite.
 * Uses the cosine rule on the Earth-observer-satellite triangle.
 */
export function computeSlantRange(
  observer: { lat: number; lng: number },
  satPosition: { lat: number; lng: number; alt: number },
): SlantRangeResult {
  const satAlt = satPosition.alt / EARTH_RADIUS_KM;
  const angDist = haversineDistance(observer.lat, observer.lng, satPosition.lat, satPosition.lng);
  const R = EARTH_RADIUS_KM;
  const rSat = R + satPosition.alt;
  const slantKm = Math.round(Math.sqrt(R * R + rSat * rSat - 2 * R * rSat * Math.cos(angDist)));
  return {
    lat: satPosition.lat,
    lng: satPosition.lng,
    alt: satAlt,
    slantKm,
    midLat: (observer.lat + satPosition.lat) / 2,
    midLng: (observer.lng + satPosition.lng) / 2,
    midAlt: satAlt / 2,
  };
}
