/**
 * Simple astronomical sun position calculator.
 * Returns the subsolar point (lat/lng where the sun is directly overhead).
 */

/** Day of year (1-366) */
function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

/**
 * Equation of Time correction (minutes).
 * Accounts for Earth's elliptical orbit and axial tilt.
 */
function equationOfTime(dayNum: number): number {
  const b = (2 * Math.PI / 365) * (dayNum - 81);
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

/**
 * Returns the subsolar point for a given date — the lat/lng on Earth
 * where the sun is directly overhead.
 */
export function getSunLatLng(date: Date): { lat: number; lng: number } {
  const dayNum = dayOfYear(date);

  // Solar declination (latitude of subsolar point)
  const lat = -23.44 * Math.cos((2 * Math.PI / 365) * (dayNum + 10));

  // Solar longitude: based on UTC time + Equation of Time correction
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const eot = equationOfTime(dayNum);
  let lng = (12 - utcHours) * 15 + eot / 4;

  // Normalize to [-180, 180]
  if (lng > 180) lng -= 360;
  if (lng < -180) lng += 360;

  return { lat, lng };
}
