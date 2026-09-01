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
  'sbas',
  'iridium',
  'military',
  'starlink',
  'oneweb',
  'globalstar',
  'orbcomm',
  'intelsat',
  'ses',
  'eutelsat',
  'telesat',
  'kuiper',
  'rassvet',
  'qianfan',
  'hulianwang',
  'planet',
  'spire',
  'radar',
  'cubesat',
  'geo',
  'visual',
  'last-30-days',
  'sarsat',
  'education',
  'engineering',
  'geodetic',
  'tdrss',
  'molniya',
  'argos',
  'dmc',
  'satnogs',
  'x-comm',
  'other-comm',
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
  sbas: 'SBAS',
  iridium: 'Iridium',
  military: 'Military',
  starlink: 'Starlink',
  oneweb: 'OneWeb',
  globalstar: 'Globalstar',
  orbcomm: 'Orbcomm',
  intelsat: 'Intelsat',
  ses: 'SES',
  eutelsat: 'Eutelsat',
  telesat: 'Telesat',
  kuiper: 'Kuiper',
  rassvet: 'Rassvet',
  qianfan: 'Qianfan',
  hulianwang: 'GuoWang',
  planet: 'Planet',
  spire: 'Spire',
  radar: 'Radar/SAR',
  cubesat: 'CubeSats',
  geo: 'Geostationary',
  visual: 'Brightest',
  'last-30-days': 'Last 30 Days',
  sarsat: 'Search & Rescue',
  education: 'Education',
  engineering: 'Engineering',
  geodetic: 'Geodetic',
  tdrss: 'TDRSS',
  molniya: 'Molniya',
  argos: 'ARGOS',
  dmc: 'DMC',
  satnogs: 'SatNOGS',
  'x-comm': 'Experimental Comm',
  'other-comm': 'Other Comm',
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
  sbas: '#ba68c8', // medium purple
  iridium: '#26a69a', // teal
  military: '#8d6e63', // brown
  starlink: '#90caf9', // light blue
  oneweb: '#7e57c2', // deep purple
  globalstar: '#29b6f6', // light blue
  orbcomm: '#9ccc65', // light green
  intelsat: '#d4e157', // lime
  ses: '#ffd54f', // amber
  eutelsat: '#ffab40', // orange-amber
  telesat: '#b388ff', // lavender
  kuiper: '#ff8a65', // salmon
  rassvet: '#ef9a9a', // light red-pink
  qianfan: '#e040fb', // magenta
  hulianwang: '#ea80fc', // light magenta
  planet: '#4db6ac', // teal-green
  spire: '#7986cb', // light indigo
  radar: '#ff5252', // bright red
  cubesat: '#69f0ae', // mint green
  geo: '#f06292', // light pink
  visual: '#fff176', // light yellow
  'last-30-days': '#76ff03', // neon green
  sarsat: '#e57373', // light red
  education: '#81c784', // medium green
  engineering: '#90a4ae', // grey-blue
  geodetic: '#a1887f', // light brown
  tdrss: '#4dd0e1', // light cyan
  molniya: '#ce93d8', // light purple
  argos: '#80cbc4', // teal-light
  dmc: '#ffcc80', // peach
  satnogs: '#aed581', // yellow-green
  'x-comm': '#b0bec5', // blue-grey
  'other-comm': '#bcaaa4', // warm grey
  active: '#00d4ff', // default cyan
};

export interface GroupInfo {
  description: string;
  operator: string;
  orbit: string;
  count: string;
  since: string;
  purpose: string;
  country: string;
  frequency: string;
  /** Minimum ground elevation angle (degrees) for realistic coverage footprint */
  minElevationDeg: number;
  /**
   * Why the group shows fewer satellites than it has in orbit. Set it whenever
   * the gap is a property of the data rather than a fault, so an empty slot
   * reads as "not published" instead of "lost".
   */
  coverageNote?: string;
}

// GROUP_INFO data lives in lib/groupInfo.ts — re-exported here for convenience
export { GROUP_INFO } from './groupInfo';

export const EARTH_RADIUS_KM = 6371;

// Groups with more satellites than this threshold use InstancedMesh rendering
export const MASS_GROUP_THRESHOLD = 500;
export const MASS_GROUPS: SatelliteGroup[] = ['starlink', 'oneweb', 'cubesat', 'qianfan', 'active'];
