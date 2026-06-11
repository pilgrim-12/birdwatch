import type { GroundStation } from '@/types/groundStation';

/** Colors for each ground station network type */
export const STATION_COLORS: Record<string, string> = {
  satnogs: '#69f0ae',  // mint green
  dsn: '#ffd54f',      // gold
  estrack: '#42a5f5',  // blue
  noaa: '#66bb6a',     // green
  other: '#90a4ae',    // blue-gray
};

/** Network display names */
export const STATION_NETWORK_LABELS: Record<string, string> = {
  satnogs: 'SatNOGS',
  dsn: 'NASA DSN',
  estrack: 'ESA ESTRACK',
  noaa: 'NOAA',
  other: 'Other',
};

/**
 * Professional ground tracking stations with fixed known locations.
 * These don't have public APIs, so we hardcode them.
 * IDs use negative numbers to avoid collision with SatNOGS station IDs.
 */
export const PROFESSIONAL_STATIONS: GroundStation[] = [
  // --- NASA Deep Space Network (DSN) ---
  {
    id: -101, name: 'Goldstone DSN', lat: 35.4267, lng: -116.89, alt: 1001,
    network: 'dsn', status: 'online', owner: 'NASA/JPL',
    antennas: ['DSS-14 (70m)', 'DSS-24 (34m)', 'DSS-25 (34m)', 'DSS-26 (34m)'],
  },
  {
    id: -102, name: 'Madrid DSN', lat: 40.4314, lng: -4.2481, alt: 830,
    network: 'dsn', status: 'online', owner: 'NASA/INTA',
    antennas: ['DSS-63 (70m)', 'DSS-54 (34m)', 'DSS-55 (34m)', 'DSS-56 (34m)'],
  },
  {
    id: -103, name: 'Canberra DSN', lat: -35.4014, lng: 148.9817, alt: 680,
    network: 'dsn', status: 'online', owner: 'NASA/CSIRO',
    antennas: ['DSS-43 (70m)', 'DSS-34 (34m)', 'DSS-35 (34m)', 'DSS-36 (34m)'],
  },

  // --- ESA ESTRACK ---
  {
    id: -110, name: 'New Norcia', lat: -31.0483, lng: 116.1917, alt: 252,
    network: 'estrack', status: 'online', owner: 'ESA',
    antennas: ['NNO-1 (35m)', 'NNO-2 (4.5m)'],
  },
  {
    id: -111, name: 'Cebreros', lat: 40.4528, lng: -4.3678, alt: 794,
    network: 'estrack', status: 'online', owner: 'ESA',
    antennas: ['CEB (35m)'],
  },
  {
    id: -112, name: 'Malargüe', lat: -35.7758, lng: -69.3983, alt: 1550,
    network: 'estrack', status: 'online', owner: 'ESA',
    antennas: ['MLG (35m)'],
  },
  {
    id: -113, name: 'Kiruna', lat: 67.8578, lng: 20.9644, alt: 402,
    network: 'estrack', status: 'online', owner: 'ESA/SSC',
    antennas: ['KIR-1 (15m)', 'KIR-2 (13m)'],
  },
  {
    id: -114, name: 'Kourou', lat: 5.2511, lng: -52.8056, alt: 12,
    network: 'estrack', status: 'online', owner: 'ESA/CNES',
    antennas: ['KRU (15m)'],
  },
  {
    id: -115, name: 'Redu', lat: 50.0017, lng: 5.1464, alt: 380,
    network: 'estrack', status: 'online', owner: 'ESA',
    antennas: ['RDU (15m)'],
  },
  {
    id: -116, name: 'Santa Maria', lat: 36.9972, lng: -25.1358, alt: 276,
    network: 'estrack', status: 'online', owner: 'ESA',
    antennas: ['SMA (5.5m)'],
  },

  // --- NOAA ---
  {
    id: -120, name: 'Wallops CDA', lat: 37.9402, lng: -75.4562, alt: 5,
    network: 'noaa', status: 'online', owner: 'NOAA/NASA',
    antennas: ['Command & Data Acquisition (13m)'],
  },
  {
    id: -121, name: 'Fairbanks CDA', lat: 64.8594, lng: -147.8503, alt: 158,
    network: 'noaa', status: 'online', owner: 'NOAA',
    antennas: ['Gilmore Creek (11m)'],
  },
  {
    id: -122, name: 'Svalbard SvalSat', lat: 78.2306, lng: 15.3892, alt: 500,
    network: 'noaa', status: 'online', owner: 'KSAT/NOAA',
    antennas: ['Multi-mission (13m)', 'Multi-mission (7.3m)'],
  },

  // --- Other notable stations ---
  {
    id: -130, name: 'Weilheim', lat: 47.8803, lng: 11.0822, alt: 565,
    network: 'other', status: 'online', owner: 'DLR',
    antennas: ['WHM (30m)', 'WGS (9m)'],
  },
  {
    id: -131, name: 'Tanegashima', lat: 30.4, lng: 131.0, alt: 50,
    network: 'other', status: 'online', owner: 'JAXA',
    antennas: ['TDRS (10m)'],
  },
  {
    id: -132, name: 'Bear Lakes', lat: 55.87, lng: 37.96, alt: 200,
    network: 'other', status: 'online', owner: 'Roscosmos',
    antennas: ['TNA-1500 (64m)'],
  },
  {
    id: -133, name: 'Dongfeng', lat: 40.96, lng: 100.29, alt: 1000,
    network: 'other', status: 'online', owner: 'CNSA',
    antennas: ['Tracking station (25m)'],
  },
];
