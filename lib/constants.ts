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

export interface GroupInfo {
  description: string;
  operator: string;
  orbit: string;
  count: string;
  since: string;
}

export const GROUP_INFO: Record<SatelliteGroup, GroupInfo> = {
  stations: {
    description: 'Inhabited and autonomous space stations in low Earth orbit, including ISS, CSS (Tiangong), and visiting crew/cargo vehicles.',
    operator: 'NASA, Roscosmos, CNSA, ESA, JAXA',
    orbit: 'LEO (400–420 km)',
    count: '~10',
    since: '1998',
  },
  weather: {
    description: 'Meteorological satellites providing global weather imagery, atmospheric sounding, and storm tracking data.',
    operator: 'NOAA, EUMETSAT, CNSA, ISRO, JMA',
    orbit: 'LEO & GEO',
    count: '~50',
    since: '1960s',
  },
  noaa: {
    description: 'US polar-orbiting weather satellites transmitting APT/HRPT imagery. Popular targets for amateur radio reception.',
    operator: 'NOAA / NASA',
    orbit: 'Sun-sync LEO (800–870 km)',
    count: '~6',
    since: '1998',
  },
  amateur: {
    description: 'Satellites carrying amateur radio transponders, digipeaters, and beacons for ham radio operators worldwide.',
    operator: 'AMSAT, universities, various',
    orbit: 'LEO (400–1500 km)',
    count: '~100+',
    since: '1961',
  },
  science: {
    description: 'Scientific research missions studying Earth, space physics, astronomy, and fundamental science from orbit.',
    operator: 'NASA, ESA, JAXA, ISRO, various',
    orbit: 'Various (LEO to L2)',
    count: '~70',
    since: '1960s',
  },
  resource: {
    description: 'Earth observation satellites for land/ocean/atmosphere monitoring, agriculture, forestry, and resource management.',
    operator: 'NASA, ESA, CNSA, various',
    orbit: 'Sun-sync LEO (500–900 km)',
    count: '~40',
    since: '1972',
  },
  goes: {
    description: 'Geostationary Operational Environmental Satellites providing continuous weather imagery of the Western Hemisphere.',
    operator: 'NOAA / NASA',
    orbit: 'GEO (35,786 km)',
    count: '~5',
    since: '1975',
  },
  'gps-ops': {
    description: 'US Global Positioning System constellation providing precision navigation, timing, and positioning worldwide.',
    operator: 'US Space Force',
    orbit: 'MEO (20,180 km)',
    count: '~31',
    since: '1978',
  },
  'glo-ops': {
    description: 'Russian global navigation satellite system, counterpart to GPS. Provides positioning for military and civilian use.',
    operator: 'Roscosmos / Russian MoD',
    orbit: 'MEO (19,130 km)',
    count: '~24',
    since: '1982',
  },
  galileo: {
    description: 'European Union global navigation satellite system providing high-accuracy positioning independent of GPS/GLONASS.',
    operator: 'EU / ESA / EUSPA',
    orbit: 'MEO (23,222 km)',
    count: '~28',
    since: '2011',
  },
  beidou: {
    description: 'Chinese global navigation satellite system (BDS) with regional and global coverage for positioning and messaging.',
    operator: 'CNSA / PLA',
    orbit: 'MEO/GEO/IGSO',
    count: '~45',
    since: '2000',
  },
  iridium: {
    description: 'Global satellite phone and data network. Iridium NEXT constellation replaced original Iridium in 2017–2019.',
    operator: 'Iridium Communications',
    orbit: 'LEO (780 km)',
    count: '~75',
    since: '2017 (NEXT)',
  },
  military: {
    description: 'Unclassified military satellites for communications, early warning, surveillance, and signals intelligence.',
    operator: 'US, Russia, China, various',
    orbit: 'Various',
    count: '~100+',
    since: '1960s',
  },
  starlink: {
    description: 'SpaceX mega-constellation for global broadband internet. Largest satellite constellation in history.',
    operator: 'SpaceX',
    orbit: 'LEO (540–570 km)',
    count: '~6400+',
    since: '2019',
  },
  oneweb: {
    description: 'LEO broadband internet constellation providing global connectivity, including Arctic coverage.',
    operator: 'Eutelsat OneWeb',
    orbit: 'LEO (1,200 km)',
    count: '~630',
    since: '2020',
  },
  globalstar: {
    description: 'Satellite phone and IoT data network with spot-beam architecture for voice and low-rate data.',
    operator: 'Globalstar Inc.',
    orbit: 'LEO (1,414 km)',
    count: '~48',
    since: '1998',
  },
  orbcomm: {
    description: 'Machine-to-machine (M2M) and IoT messaging constellation for asset tracking, fleet management, and SCADA.',
    operator: 'Orbcomm Inc.',
    orbit: 'LEO (750 km)',
    count: '~36',
    since: '1997',
  },
  intelsat: {
    description: 'One of the largest GEO satellite operators providing broadcast TV, telephony, and enterprise data worldwide.',
    operator: 'Intelsat S.A.',
    orbit: 'GEO (35,786 km)',
    count: '~50',
    since: '1965',
  },
  ses: {
    description: 'Major satellite operator with GEO fleet (SES) and MEO constellation (O3b mPOWER) for video and data.',
    operator: 'SES S.A.',
    orbit: 'GEO + MEO (8,062 km)',
    count: '~70',
    since: '1988',
  },
  planet: {
    description: 'Earth imaging constellation of Dove/SuperDove 3U CubeSats capturing daily global imagery at 3–5m resolution.',
    operator: 'Planet Labs PBC',
    orbit: 'Sun-sync LEO (475–525 km)',
    count: '~200+',
    since: '2014',
  },
  spire: {
    description: 'CubeSat constellation for weather data (GNSS-RO), maritime tracking (AIS), and aircraft tracking (ADS-B).',
    operator: 'Spire Global',
    orbit: 'LEO (400–650 km)',
    count: '~100+',
    since: '2015',
  },
  geo: {
    description: 'All satellites in geostationary orbit — stationary above equator. Includes comms, weather, and military.',
    operator: 'Various',
    orbit: 'GEO (35,786 km)',
    count: '~500+',
    since: '1964',
  },
  visual: {
    description: 'Brightest satellites visible to the naked eye. Useful for planning visual observation sessions.',
    operator: 'Various',
    orbit: 'Various',
    count: '~100',
    since: 'N/A',
  },
  sarsat: {
    description: 'COSPAS-SARSAT search and rescue system. Detects emergency beacons (EPIRB, ELT, PLB) and relays distress alerts.',
    operator: 'NOAA, Roscosmos, EUMETSAT, ISRO',
    orbit: 'LEO + MEO + GEO',
    count: '~10',
    since: '1982',
  },
  education: {
    description: 'CubeSats and small satellites built by universities and student teams for educational and research purposes.',
    operator: 'Universities worldwide',
    orbit: 'LEO (300–700 km)',
    count: '~100+',
    since: '2003',
  },
  engineering: {
    description: 'Technology demonstration and experimental satellites testing new hardware, propulsion, and communication systems.',
    operator: 'Various space agencies & companies',
    orbit: 'LEO',
    count: '~50+',
    since: '1990s',
  },
  geodetic: {
    description: 'Passive laser retroreflector satellites used for precise geodesy, plate tectonics, and gravity field measurement.',
    operator: 'NASA, ASI, JAXA',
    orbit: 'LEO–MEO (800–5,900 km)',
    count: '~10',
    since: '1976',
  },
  tdrss: {
    description: 'NASA Tracking and Data Relay Satellite System — relay network for ISS, Hubble, and LEO spacecraft communications.',
    operator: 'NASA',
    orbit: 'GEO (35,786 km)',
    count: '~9',
    since: '1983',
  },
  molniya: {
    description: 'Russian communications satellites in highly elliptical Molniya orbits optimized for high-latitude coverage.',
    operator: 'Roscosmos / Russian MoD',
    orbit: 'HEO (500–40,000 km)',
    count: '~5',
    since: '1965',
  },
  active: {
    description: 'All cataloged active satellites from the combined CelesTrak database.',
    operator: 'Various',
    orbit: 'Various',
    count: '~10,000+',
    since: 'N/A',
  },
};

export const EARTH_RADIUS_KM = 6371;

// Groups with more satellites than this threshold use InstancedMesh rendering
export const MASS_GROUP_THRESHOLD = 500;
export const MASS_GROUPS: SatelliteGroup[] = ['starlink', 'oneweb', 'active'];
