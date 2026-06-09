import { EARTH_RADIUS_KM } from './constants';

/**
 * Earth-central half-angle for a satellite footprint given altitude and
 * minimum ground-station elevation angle.
 *
 * For 0° elevation this equals acos(R/(R+h)) — the geometric horizon.
 * A positive minElev shrinks the circle to the region where the satellite
 * appears above that elevation angle.
 */
function earthCentralAngle(altKm: number, minElevDeg: number): number {
  const R = EARTH_RADIUS_KM;
  const elevRad = (minElevDeg * Math.PI) / 180;
  // Nadir angle from satellite to ground point at given elevation
  const sinNadir = (R / (R + altKm)) * Math.cos(elevRad);
  const nadir = Math.asin(sinNadir);
  // Earth-central angle = 90° - elevation - nadir
  return Math.PI / 2 - elevRad - nadir;
}

/**
 * Generate a circle of lat/lng points representing a satellite's ground footprint.
 *
 * @param lat  Sub-satellite latitude (degrees)
 * @param lng  Sub-satellite longitude (degrees)
 * @param altKm  Satellite altitude in km
 * @param numPoints  Number of polygon vertices (default 64)
 * @param minElevDeg  Minimum elevation angle in degrees (default 0)
 * @returns Array of [lng, lat] coordinate pairs forming a closed polygon
 */
export function computeFootprintCircle(
  lat: number,
  lng: number,
  altKm: number,
  numPoints = 64,
  minElevDeg = 0,
): [number, number][] {
  const rho = earthCentralAngle(altKm, minElevDeg);
  if (rho <= 0) return [];

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
export function footprintRadiusDeg(altKm: number, minElevDeg = 0): number {
  return (earthCentralAngle(altKm, minElevDeg) * 180) / Math.PI;
}
