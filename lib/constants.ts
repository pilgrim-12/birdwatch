export const CELESTRAK_BASE_URL = 'https://celestrak.org/NORAD/elements/gp.php';

export const ALLOWED_GROUPS = [
  'stations',
  'weather',
  'noaa',
  'amateur',
  'starlink',
  'gps-ops',
  'active',
] as const;

export type SatelliteGroup = (typeof ALLOWED_GROUPS)[number];

export const GROUP_LABELS: Record<SatelliteGroup, string> = {
  stations: 'Space Stations',
  weather: 'Weather',
  noaa: 'NOAA',
  amateur: 'Amateur Radio',
  starlink: 'Starlink',
  'gps-ops': 'GPS',
  active: 'Active Satellites',
};

export const EARTH_RADIUS_KM = 6371;
