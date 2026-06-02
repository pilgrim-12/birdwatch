/**
 * Lunar position calculator using low-precision Meeus formulas.
 * Returns the sublunar point (lat/lng where the moon is directly overhead).
 * Accuracy: ~0.5° — sufficient for visual representation on a 3D globe.
 */

const DEG2RAD = Math.PI / 180;

/** Convert JS Date to Julian Date */
function toJulianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

/** Normalize angle to [0, 360) */
function normalize(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/**
 * Returns the sublunar point for a given date — the lat/lng on Earth
 * where the moon is directly overhead.
 */
export function getMoonLatLng(date: Date): { lat: number; lng: number } {
  const jd = toJulianDate(date);
  const T = (jd - 2451545.0) / 36525.0; // Julian centuries since J2000.0

  // Fundamental arguments (degrees)
  const Lp = normalize(218.3164477 + 481267.88123421 * T
    - 0.0015786 * T * T + T * T * T / 538841);
  const D = normalize(297.8501921 + 445267.1114034 * T
    - 0.0018819 * T * T + T * T * T / 545868);
  const M = normalize(357.5291092 + 35999.0502909 * T
    - 0.0001536 * T * T + T * T * T / 24490000);
  const Mp = normalize(134.9633964 + 477198.8675055 * T
    + 0.0087414 * T * T + T * T * T / 69699);
  const F = normalize(93.2720950 + 483202.0175233 * T
    - 0.0036539 * T * T - T * T * T / 3526000);

  // Convert to radians for trig
  const dr = DEG2RAD;
  const Dr = D * dr, Mr = M * dr, Mpr = Mp * dr, Fr = F * dr;

  // Periodic terms for ecliptic longitude (coefficients in 0.000001°)
  const sumL =
      6288774 * Math.sin(Mpr)
    + 1274027 * Math.sin(2 * Dr - Mpr)
    +  658314 * Math.sin(2 * Dr)
    +  213618 * Math.sin(2 * Mpr)
    -  185116 * Math.sin(Mr)
    -  114332 * Math.sin(2 * Fr)
    +   58793 * Math.sin(2 * Dr - 2 * Mpr)
    +   57066 * Math.sin(2 * Dr - Mr - Mpr)
    +   53322 * Math.sin(2 * Dr + Mpr)
    +   45758 * Math.sin(2 * Dr - Mr)
    -   40923 * Math.sin(Mr - Mpr)
    -   34720 * Math.sin(Dr)
    -   30383 * Math.sin(Mr + Mpr)
    +   15327 * Math.sin(2 * Dr - 2 * Fr)
    -   12528 * Math.sin(Mpr + 2 * Fr)
    +   10980 * Math.sin(Mpr - 2 * Fr)
    +   10675 * Math.sin(4 * Dr - Mpr)
    +   10034 * Math.sin(3 * Mpr)
    +    8548 * Math.sin(4 * Dr - 2 * Mpr)
    -    7888 * Math.sin(2 * Dr + Mr - Mpr)
    -    6766 * Math.sin(2 * Dr + Mr)
    -    5163 * Math.sin(Dr - Mpr)
    +    4987 * Math.sin(Dr + Mr)
    +    4036 * Math.sin(2 * Dr - Mr + Mpr);

  // Periodic terms for ecliptic latitude (coefficients in 0.000001°)
  const sumB =
      5128122 * Math.sin(Fr)
    +  280602 * Math.sin(Mpr + Fr)
    +  277693 * Math.sin(Mpr - Fr)
    +  173237 * Math.sin(2 * Dr - Fr)
    +   55413 * Math.sin(2 * Dr - Mpr + Fr)
    +   46271 * Math.sin(2 * Dr - Mpr - Fr)
    +   32573 * Math.sin(2 * Dr + Fr)
    +   17198 * Math.sin(2 * Mpr + Fr)
    +    9266 * Math.sin(2 * Dr + Mpr - Fr)
    +    8822 * Math.sin(2 * Mpr - Fr)
    +    8216 * Math.sin(2 * Dr - Mr - Fr)
    +    4324 * Math.sin(2 * Dr - 2 * Mpr - Fr)
    +    4200 * Math.sin(2 * Dr + Mpr + Fr);

  // Ecliptic coordinates
  const eclipticLon = normalize(Lp + sumL / 1_000_000);
  const eclipticLat = sumB / 1_000_000;

  // Mean obliquity of the ecliptic
  const epsilon = (23.4392911 - 0.0130042 * T) * dr;

  // Ecliptic to equatorial conversion
  const eLat = eclipticLat * dr;
  const eLon = eclipticLon * dr;

  const rightAscension = Math.atan2(
    Math.sin(eLon) * Math.cos(epsilon) - Math.tan(eLat) * Math.sin(epsilon),
    Math.cos(eLon),
  );
  const declination = Math.asin(
    Math.sin(eLat) * Math.cos(epsilon) + Math.cos(eLat) * Math.sin(epsilon) * Math.sin(eLon),
  );

  // Greenwich Mean Sidereal Time (degrees)
  const GMST = normalize(280.46061837 + 360.98564736629 * (jd - 2451545.0)
    + 0.000387933 * T * T - T * T * T / 38710000);

  // Sublunar point
  const lat = declination / dr;
  let lng = GMST - rightAscension / dr;
  lng = ((lng % 360) + 540) % 360 - 180; // normalize to [-180, 180]

  return { lat, lng };
}
