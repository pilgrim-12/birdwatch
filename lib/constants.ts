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
  'oneweb',
  'globalstar',
  'orbcomm',
  'intelsat',
  'ses',
  'planet',
  'spire',
  'geo',
  'visual',
  'sarsat',
  'education',
  'engineering',
  'geodetic',
  'tdrss',
  'molniya',
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
  oneweb: 'OneWeb',
  globalstar: 'Globalstar',
  orbcomm: 'Orbcomm',
  intelsat: 'Intelsat',
  ses: 'SES',
  planet: 'Planet',
  spire: 'Spire',
  geo: 'Geostationary',
  visual: 'Brightest',
  sarsat: 'Search & Rescue',
  education: 'Education',
  engineering: 'Engineering',
  geodetic: 'Geodetic',
  tdrss: 'TDRSS',
  molniya: 'Molniya',
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
  'glo-ops': '#ef5350', // red-ish
  galileo: '#5c6bc0', // indigo
  beidou: '#ff7043', // deep orange
  iridium: '#26a69a', // teal
  military: '#8d6e63', // brown
  starlink: '#78909c', // blue-grey
  oneweb: '#7e57c2', // deep purple
  globalstar: '#29b6f6', // light blue
  orbcomm: '#9ccc65', // light green
  intelsat: '#d4e157', // lime
  ses: '#ffd54f', // amber
  planet: '#4db6ac', // teal-green
  spire: '#7986cb', // light indigo
  geo: '#f06292', // light pink
  visual: '#fff176', // light yellow
  sarsat: '#e57373', // light red
  education: '#81c784', // medium green
  engineering: '#90a4ae', // grey-blue
  geodetic: '#a1887f', // light brown
  tdrss: '#4dd0e1', // light cyan
  molniya: '#ce93d8', // light purple
  active: '#00d4ff', // default cyan
};

export const EARTH_RADIUS_KM = 6371;

// Groups with more satellites than this threshold use InstancedMesh rendering
export const MASS_GROUP_THRESHOLD = 500;
export const MASS_GROUPS: SatelliteGroup[] = ['starlink', 'oneweb', 'active'];
