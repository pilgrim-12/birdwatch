export const CELESTRAK_BASE_URL = 'https://celestrak.org/NORAD/elements/gp.php';

export const ALLOWED_GROUPS = [
  'stations',
  'weather',
  'noaa',
  'amateur',
  'science',
  'resource',
  'goes',
  'gps-ops',
  'glo-ops',
  'galileo',
  'beidou',
  'iridium',
  'military',
  'starlink',
  'active',
] as const;

export type SatelliteGroup = (typeof ALLOWED_GROUPS)[number];

export const GROUP_LABELS: Record<SatelliteGroup, string> = {
  stations: 'Space Stations',
  weather: 'Weather',
  noaa: 'NOAA',
  amateur: 'Amateur Radio',
  science: 'Science',
  resource: 'Earth Resources',
  goes: 'GOES',
  'gps-ops': 'GPS',
  'glo-ops': 'GLONASS',
  galileo: 'Galileo',
  beidou: 'Beidou',
  iridium: 'Iridium',
  military: 'Military',
  starlink: 'Starlink',
  active: 'Active Satellites',
};

export const GROUP_COLORS: Record<SatelliteGroup, string> = {
  stations: '#ff6b6b', // red
  weather: '#ffa726', // orange
  noaa: '#66bb6a', // green
  amateur: '#ab47bc', // purple
  science: '#42a5f5', // blue
  resource: '#26c6da', // cyan
  goes: '#ffee58', // yellow
  'gps-ops': '#ec407a', // pink
  'glo-ops': '#ef5350', // red-ish (Russia)
  galileo: '#5c6bc0', // indigo (EU)
  beidou: '#ff7043', // deep orange (China)
  iridium: '#26a69a', // teal
  military: '#8d6e63', // brown
  starlink: '#78909c', // blue-grey
  active: '#00d4ff', // default cyan
};

export const EARTH_RADIUS_KM = 6371;

// Groups with more satellites than this threshold use InstancedMesh rendering
export const MASS_GROUP_THRESHOLD = 500;
export const MASS_GROUPS: SatelliteGroup[] = ['starlink', 'active'];
