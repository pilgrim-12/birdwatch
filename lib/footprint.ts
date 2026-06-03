import { EARTH_RADIUS_KM } from './constants';

/**
 * Generate a circle of lat/lng points representing a satellite's ground footprint
 * (the area on Earth visible from the satellite at 0° elevation angle).
 *
 * @param lat  Sub-satellite latitude (degrees)
 * @param lng  Sub-satellite longitude (degrees)
 * @param altKm  Satellite altitude in km
 * @param numPoints  Number of polygon vertices (default 64)
 * @returns Array of [lng, lat] coordinate pairs forming a closed polygon
 */
export function computeFootprintCircle(
  lat: number,
  lng: number,
  altKm: number,
  numPoints = 64,
): [number, number][] {
  const R = EARTH_RADIUS_KM;
  // Half-angle of the footprint cone (0° elevation)
  const rho = Math.acos(R / (R + altKm));

  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const points: [number, number][] = [];

  for (let i = 0; i <= numPoints; i++) {
    const bearing = (2 * Math.PI * i) / numPoints;

    // Great-circle destination formula
    const pLat = Math.asin(
      Math.sin(latRad) * Math.cos(rho) +
        Math.cos(latRad) * Math.sin(rho) * Math.cos(bearing),
    );
    const pLng =
      lngRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(rho) * Math.cos(latRad),
        Math.cos(rho) - Math.sin(latRad) * Math.sin(pLat),
      );

    points.push([(pLng * 180) / Math.PI, (pLat * 180) / Math.PI]);
  }

  return points;
}

/**
 * Footprint angular radius in degrees (useful for flat map rendering).
 */
export function footprintRadiusDeg(altKm: number): number {
  const R = EARTH_RADIUS_KM;
  return (Math.acos(R / (R + altKm)) * 180) / Math.PI;
}
