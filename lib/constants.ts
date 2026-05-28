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
  purpose: string;
  country: string;
  frequency: string;
}

export const GROUP_INFO: Record<SatelliteGroup, GroupInfo> = {
  stations: {
    description: 'Inhabited and autonomous space stations in low Earth orbit, including ISS, CSS (Tiangong), and visiting crew/cargo vehicles.',
    operator: 'NASA, Roscosmos, CNSA, ESA, JAXA',
    orbit: 'LEO (400–420 km)',
    count: '~10',
    since: '1998',
    purpose: 'Crewed Research',
    country: 'International',
    frequency: 'S-band, Ku-band, UHF (145.8/437.8 MHz)',
  },
  weather: {
    description: 'Meteorological satellites providing global weather imagery, atmospheric sounding, and storm tracking data.',
    operator: 'NOAA, EUMETSAT, CNSA, ISRO, JMA',
    orbit: 'LEO & GEO',
    count: '~50',
    since: '1960s',
    purpose: 'Meteorology',
    country: 'International',
    frequency: 'L-band (1694–1710 MHz), S-band, UHF (137 MHz APT)',
  },
  noaa: {
    description: 'US polar-orbiting weather satellites transmitting APT/HRPT imagery. Popular targets for amateur radio reception.',
    operator: 'NOAA / NASA',
    orbit: 'Sun-sync LEO (800–870 km)',
    count: '~6',
    since: '1998',
    purpose: 'Weather Imaging',
    country: 'USA',
    frequency: '137 MHz APT, 1698/1707 MHz HRPT',
  },
  amateur: {
    description: 'Satellites carrying amateur radio transponders, digipeaters, and beacons for ham radio operators worldwide.',
    operator: 'AMSAT, universities, various',
    orbit: 'LEO (400–1500 km)',
    count: '~100+',
    since: '1961',
    purpose: 'Amateur Radio',
    country: 'International',
    frequency: 'VHF/UHF (145/435 MHz), HF (10m/15m)',
  },
  science: {
    description: 'Scientific research missions studying Earth, space physics, astronomy, and fundamental science from orbit.',
    operator: 'NASA, ESA, JAXA, ISRO, various',
    orbit: 'Various (LEO to L2)',
    count: '~70',
    since: '1960s',
    purpose: 'Scientific Research',
    country: 'International',
    frequency: 'S-band, X-band, Ka-band (varies by mission)',
  },
  resource: {
    description: 'Earth observation satellites for land/ocean/atmosphere monitoring, agriculture, forestry, and resource management.',
    operator: 'NASA, ESA, CNSA, various',
    orbit: 'Sun-sync LEO (500–900 km)',
    count: '~40',
    since: '1972',
    purpose: 'Earth Observation',
    country: 'International',
    frequency: 'X-band (8 GHz), S-band downlink',
  },
  goes: {
    description: 'Geostationary Operational Environmental Satellites providing continuous weather imagery of the Western Hemisphere.',
    operator: 'NOAA / NASA',
    orbit: 'GEO (35,786 km)',
    count: '~5',
    since: '1975',
    purpose: 'Weather Monitoring',
    country: 'USA',
    frequency: 'L-band (1686.6 MHz HRIT/LRIT), S-band',
  },
  'gps-ops': {
    description: 'US Global Positioning System constellation providing precision navigation, timing, and positioning worldwide.',
    operator: 'US Space Force',
    orbit: 'MEO (20,180 km)',
    count: '~31',
    since: '1978',
    purpose: 'Navigation (GNSS)',
    country: 'USA',
    frequency: 'L1 (1575.42 MHz), L2 (1227.6 MHz), L5 (1176.45 MHz)',
  },
  'glo-ops': {
    description: 'Russian global navigation satellite system, counterpart to GPS. Provides positioning for military and civilian use.',
    operator: 'Roscosmos / Russian MoD',
    orbit: 'MEO (19,130 km)',
    count: '~24',
    since: '1982',
    purpose: 'Navigation (GNSS)',
    country: 'Russia',
    frequency: 'L1 (1602 MHz), L2 (1246 MHz), L3 (1202 MHz)',
  },
  galileo: {
    description: 'European Union global navigation satellite system providing high-accuracy positioning independent of GPS/GLONASS.',
    operator: 'EU / ESA / EUSPA',
    orbit: 'MEO (23,222 km)',
    count: '~28',
    since: '2011',
    purpose: 'Navigation (GNSS)',
    country: 'EU',
    frequency: 'E1 (1575.42 MHz), E5a/E5b (1176/1207 MHz), E6 (1278 MHz)',
  },
  beidou: {
    description: 'Chinese global navigation satellite system (BDS) with regional and global coverage for positioning and messaging.',
    operator: 'CNSA / PLA',
    orbit: 'MEO/GEO/IGSO',
    count: '~45',
    since: '2000',
    purpose: 'Navigation (GNSS)',
    country: 'China',
    frequency: 'B1 (1561 MHz), B2 (1207 MHz), B3 (1268 MHz)',
  },
  iridium: {
    description: 'Global satellite phone and data network. Iridium NEXT constellation replaced original Iridium in 2017–2019.',
    operator: 'Iridium Communications',
    orbit: 'LEO (780 km)',
    count: '~75',
    since: '2017 (NEXT)',
    purpose: 'Communication (Voice/Data)',
    country: 'USA',
    frequency: 'L-band (1616–1626.5 MHz), Ka-band crosslinks',
  },
  military: {
    description: 'Unclassified military satellites for communications, early warning, surveillance, and signals intelligence.',
    operator: 'US, Russia, China, various',
    orbit: 'Various',
    count: '~100+',
    since: '1960s',
    purpose: 'Defense & Intelligence',
    country: 'International',
    frequency: 'UHF, SHF, EHF (classified/varies)',
  },
  starlink: {
    description: 'SpaceX mega-constellation for global broadband internet. Largest satellite constellation in history.',
    operator: 'SpaceX',
    orbit: 'LEO (540–570 km)',
    count: '~6400+',
    since: '2019',
    purpose: 'Broadband Internet',
    country: 'USA',
    frequency: 'Ku-band (10.7–12.7 / 14–14.5 GHz), Ka-band, V-band (future)',
  },
  oneweb: {
    description: 'LEO broadband internet constellation providing global connectivity, including Arctic coverage.',
    operator: 'Eutelsat OneWeb',
    orbit: 'LEO (1,200 km)',
    count: '~630',
    since: '2020',
    purpose: 'Broadband Internet',
    country: 'UK / France',
    frequency: 'Ku-band (10.7–12.75 / 14–14.5 GHz), Ka-band gateway',
  },
  globalstar: {
    description: 'Satellite phone and IoT data network with spot-beam architecture for voice and low-rate data.',
    operator: 'Globalstar Inc.',
    orbit: 'LEO (1,414 km)',
    count: '~48',
    since: '1998',
    purpose: 'Communication (Voice/IoT)',
    country: 'USA',
    frequency: 'L-band (1610–1618 MHz), S-band (2483–2500 MHz), C-band feeder',
  },
  orbcomm: {
    description: 'Machine-to-machine (M2M) and IoT messaging constellation for asset tracking, fleet management, and SCADA.',
    operator: 'Orbcomm Inc.',
    orbit: 'LEO (750 km)',
    count: '~36',
    since: '1997',
    purpose: 'IoT / M2M Data',
    country: 'USA',
    frequency: 'VHF (137–138 MHz uplink, 400 MHz downlink)',
  },
  intelsat: {
    description: 'One of the largest GEO satellite operators providing broadcast TV, telephony, and enterprise data worldwide.',
    operator: 'Intelsat S.A.',
    orbit: 'GEO (35,786 km)',
    count: '~50',
    since: '1965',
    purpose: 'Communication (TV/Data)',
    country: 'USA / Luxembourg',
    frequency: 'C-band (3.4–4.2 / 5.9–6.4 GHz), Ku-band, Ka-band',
  },
  ses: {
    description: 'Major satellite operator with GEO fleet (SES) and MEO constellation (O3b mPOWER) for video and data.',
    operator: 'SES S.A.',
    orbit: 'GEO + MEO (8,062 km)',
    count: '~70',
    since: '1988',
    purpose: 'Communication (TV/Data)',
    country: 'Luxembourg',
    frequency: 'C-band, Ku-band, Ka-band (O3b mPOWER)',
  },
  planet: {
    description: 'Earth imaging constellation of Dove/SuperDove 3U CubeSats capturing daily global imagery at 3–5m resolution.',
    operator: 'Planet Labs PBC',
    orbit: 'Sun-sync LEO (475–525 km)',
    count: '~200+',
    since: '2014',
    purpose: 'Earth Imaging',
    country: 'USA',
    frequency: 'X-band (8 GHz downlink), S-band TT&C',
  },
  spire: {
    description: 'CubeSat constellation for weather data (GNSS-RO), maritime tracking (AIS), and aircraft tracking (ADS-B).',
    operator: 'Spire Global',
    orbit: 'LEO (400–650 km)',
    count: '~100+',
    since: '2015',
    purpose: 'Weather / AIS / ADS-B',
    country: 'USA',
    frequency: 'GNSS-RO L-band, VHF (162 MHz AIS), 1090 MHz ADS-B',
  },
  geo: {
    description: 'All satellites in geostationary orbit — stationary above equator. Includes comms, weather, and military.',
    operator: 'Various',
    orbit: 'GEO (35,786 km)',
    count: '~500+',
    since: '1964',
    purpose: 'Mixed (Comms/Weather/Military)',
    country: 'International',
    frequency: 'C/Ku/Ka-band (varies)',
  },
  visual: {
    description: 'Brightest satellites visible to the naked eye. Useful for planning visual observation sessions.',
    operator: 'Various',
    orbit: 'Various',
    count: '~100',
    since: 'N/A',
    purpose: 'Visual Observation',
    country: 'International',
    frequency: 'N/A (optical only)',
  },
  sarsat: {
    description: 'COSPAS-SARSAT search and rescue system. Detects emergency beacons (EPIRB, ELT, PLB) and relays distress alerts.',
    operator: 'NOAA, Roscosmos, EUMETSAT, ISRO',
    orbit: 'LEO + MEO + GEO',
    count: '~10',
    since: '1982',
    purpose: 'Search & Rescue',
    country: 'International',
    frequency: '406 MHz (beacon), 1544 MHz (relay downlink)',
  },
  education: {
    description: 'CubeSats and small satellites built by universities and student teams for educational and research purposes.',
    operator: 'Universities worldwide',
    orbit: 'LEO (300–700 km)',
    count: '~100+',
    since: '2003',
    purpose: 'Education / STEM',
    country: 'International',
    frequency: 'VHF/UHF (145/435 MHz), S-band (varies)',
  },
  engineering: {
    description: 'Technology demonstration and experimental satellites testing new hardware, propulsion, and communication systems.',
    operator: 'Various space agencies & companies',
    orbit: 'LEO',
    count: '~50+',
    since: '1990s',
    purpose: 'Technology Demo',
    country: 'International',
    frequency: 'S-band, X-band (varies by mission)',
  },
  geodetic: {
    description: 'Passive laser retroreflector satellites used for precise geodesy, plate tectonics, and gravity field measurement.',
    operator: 'NASA, ASI, JAXA',
    orbit: 'LEO–MEO (800–5,900 km)',
    count: '~10',
    since: '1976',
    purpose: 'Geodesy / Geophysics',
    country: 'USA / Italy / Japan',
    frequency: 'N/A (passive laser retroreflectors)',
  },
  tdrss: {
    description: 'NASA Tracking and Data Relay Satellite System — relay network for ISS, Hubble, and LEO spacecraft communications.',
    operator: 'NASA',
    orbit: 'GEO (35,786 km)',
    count: '~9',
    since: '1983',
    purpose: 'Data Relay',
    country: 'USA',
    frequency: 'S-band, Ku-band (13.7 GHz), Ka-band (26 GHz)',
  },
  molniya: {
    description: 'Russian communications satellites in highly elliptical Molniya orbits optimized for high-latitude coverage.',
    operator: 'Roscosmos / Russian MoD',
    orbit: 'HEO (500–40,000 km)',
    count: '~5',
    since: '1965',
    purpose: 'Communication (HEO)',
    country: 'Russia',
    frequency: 'C-band, UHF military bands',
  },
  active: {
    description: 'All cataloged active satellites from the combined CelesTrak database.',
    operator: 'Various',
    orbit: 'Various',
    count: '~10,000+',
    since: 'N/A',
    purpose: 'All Active Payloads',
    country: 'International',
    frequency: 'All bands',
  },
};

export const EARTH_RADIUS_KM = 6371;

// Groups with more satellites than this threshold use InstancedMesh rendering
export const MASS_GROUP_THRESHOLD = 500;
export const MASS_GROUPS: SatelliteGroup[] = ['starlink', 'oneweb', 'active'];
