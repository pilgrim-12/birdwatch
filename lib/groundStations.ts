import type { GroundStation } from '@/types/groundStation';

/** Colors for each ground station network type */
export const STATION_COLORS: Record<string, string> = {
  satnogs: '#69f0ae',  // mint green
  dsn: '#ffd54f',      // gold
  estrack: '#42a5f5',  // blue
  noaa: '#66bb6a',     // green
  isro: '#ff8a65',     // orange
  jaxa: '#ef5350',     // red
  roscosmos: '#ab47bc', // purple
  cnsa: '#e53935',     // crimson
  ksat: '#26c6da',     // cyan
  other: '#90a4ae',    // blue-gray
};

/** Network display names */
export const STATION_NETWORK_LABELS: Record<string, string> = {
  satnogs: 'SatNOGS',
  dsn: 'NASA DSN',
  estrack: 'ESA ESTRACK',
  noaa: 'NOAA',
  isro: 'ISRO ISTRAC',
  jaxa: 'JAXA',
  roscosmos: 'Roscosmos',
  cnsa: 'CNSA',
  ksat: 'KSAT',
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

  // --- ISRO ISTRAC (India) ---
  {
    id: -140, name: 'ISTRAC Bangalore', lat: 13.0297, lng: 77.566, alt: 920,
    network: 'isro', status: 'online', owner: 'ISRO',
    antennas: ['ISTRAC-1 (11m)', 'ISTRAC-2 (11m)'],
  },
  {
    id: -141, name: 'ISTRAC Lucknow', lat: 26.847, lng: 80.946, alt: 123,
    network: 'isro', status: 'online', owner: 'ISRO',
    antennas: ['Tracking antenna (11m)'],
  },
  {
    id: -142, name: 'ISTRAC Mauritius', lat: -20.225, lng: 57.525, alt: 420,
    network: 'isro', status: 'online', owner: 'ISRO',
    antennas: ['Tracking antenna (11m)'],
  },
  {
    id: -143, name: 'ISTRAC Port Blair', lat: 11.623, lng: 92.727, alt: 15,
    network: 'isro', status: 'online', owner: 'ISRO',
    antennas: ['Tracking antenna (7.5m)'],
  },
  {
    id: -144, name: 'ISTRAC Thiruvananthapuram', lat: 8.524, lng: 76.937, alt: 60,
    network: 'isro', status: 'online', owner: 'ISRO',
    antennas: ['Tracking antenna (11m)'],
  },
  {
    id: -145, name: 'ISTRAC Brunei', lat: 4.938, lng: 114.95, alt: 20,
    network: 'isro', status: 'online', owner: 'ISRO',
    antennas: ['Tracking antenna (7.5m)'],
  },
  {
    id: -146, name: 'ISTRAC Biak', lat: -1.175, lng: 136.109, alt: 30,
    network: 'isro', status: 'online', owner: 'ISRO/LAPAN',
    antennas: ['Tracking antenna (7.5m)'],
  },
  {
    id: -147, name: 'IDSN Byalalu', lat: 13.062, lng: 77.375, alt: 844,
    network: 'isro', status: 'online', owner: 'ISRO',
    antennas: ['IDSN (32m)', 'IDSN (18m)'],
  },

  // --- JAXA (Japan) ---
  {
    id: -150, name: 'Usuda DSC', lat: 36.133, lng: 138.363, alt: 1456,
    network: 'jaxa', status: 'online', owner: 'JAXA',
    antennas: ['Usuda 64m deep-space antenna'],
  },
  {
    id: -151, name: 'Tsukuba Space Center', lat: 36.066, lng: 140.133, alt: 30,
    network: 'jaxa', status: 'online', owner: 'JAXA',
    antennas: ['TDRS (10m)', 'S-band (13m)'],
  },
  {
    id: -152, name: 'Katsuura', lat: 35.1, lng: 140.3, alt: 100,
    network: 'jaxa', status: 'online', owner: 'JAXA',
    antennas: ['Tracking (20m)'],
  },
  {
    id: -153, name: 'Okinawa', lat: 26.5, lng: 127.8, alt: 80,
    network: 'jaxa', status: 'online', owner: 'JAXA',
    antennas: ['Tracking (18m)'],
  },
  {
    id: -154, name: 'Tanegashima', lat: 30.4, lng: 131.0, alt: 50,
    network: 'jaxa', status: 'online', owner: 'JAXA',
    antennas: ['TDRS (10m)'],
  },
  {
    id: -155, name: 'Sagamihara ISAS', lat: 35.569, lng: 139.395, alt: 80,
    network: 'jaxa', status: 'online', owner: 'JAXA/ISAS',
    antennas: ['ISAS (10m)', 'ISAS (20m)'],
  },

  // --- CNSA (China) ---
  {
    id: -160, name: 'Dongfeng', lat: 40.96, lng: 100.29, alt: 1000,
    network: 'cnsa', status: 'online', owner: 'CNSA',
    antennas: ['Tracking station (25m)'],
  },
  {
    id: -161, name: 'Kashgar', lat: 39.5, lng: 76.1, alt: 1290,
    network: 'cnsa', status: 'online', owner: 'CNSA',
    antennas: ['Deep-space (35m)', 'Tracking (13m)'],
  },
  {
    id: -162, name: 'Sanya', lat: 18.25, lng: 109.5, alt: 25,
    network: 'cnsa', status: 'online', owner: 'CNSA',
    antennas: ['Tracking (12m)'],
  },
  {
    id: -163, name: 'Miyun Beijing', lat: 40.56, lng: 116.97, alt: 150,
    network: 'cnsa', status: 'online', owner: 'CNSA/NAO',
    antennas: ['VLBI (50m)'],
  },
  {
    id: -164, name: 'Kunming', lat: 25.025, lng: 102.797, alt: 1920,
    network: 'cnsa', status: 'online', owner: 'CNSA/YAO',
    antennas: ['VLBI (40m)'],
  },
  {
    id: -165, name: 'Jiamusi', lat: 46.8, lng: 130.3, alt: 80,
    network: 'cnsa', status: 'online', owner: 'CNSA',
    antennas: ['Deep-space (66m)'],
  },
  {
    id: -166, name: 'Tianlian Xiamen', lat: 24.48, lng: 118.09, alt: 30,
    network: 'cnsa', status: 'online', owner: 'CNSA',
    antennas: ['TDRS (13m)'],
  },

  // --- Roscosmos (Russia) ---
  {
    id: -170, name: 'Bear Lakes', lat: 55.87, lng: 37.96, alt: 200,
    network: 'roscosmos', status: 'online', owner: 'Roscosmos',
    antennas: ['TNA-1500 (64m)'],
  },
  {
    id: -171, name: 'Evpatoria RT-70', lat: 45.19, lng: 33.18, alt: 24,
    network: 'roscosmos', status: 'online', owner: 'Roscosmos',
    antennas: ['RT-70 (70m)'],
  },
  {
    id: -172, name: 'Ussuriysk', lat: 43.8, lng: 131.95, alt: 100,
    network: 'roscosmos', status: 'online', owner: 'Roscosmos',
    antennas: ['P-2500 (70m)'],
  },
  {
    id: -173, name: 'Kalyazin', lat: 57.23, lng: 37.63, alt: 125,
    network: 'roscosmos', status: 'online', owner: 'Roscosmos/ASC',
    antennas: ['TNA-1500K (64m)'],
  },
  {
    id: -174, name: 'Vostochny', lat: 51.88, lng: 128.33, alt: 200,
    network: 'roscosmos', status: 'online', owner: 'Roscosmos',
    antennas: ['Tracking complex'],
  },

  // --- KSAT (Kongsberg Satellite Services) ---
  {
    id: -180, name: 'Tromsø TrollSat', lat: 69.663, lng: 18.941, alt: 130,
    network: 'ksat', status: 'online', owner: 'KSAT',
    antennas: ['Multi-mission (13m)', 'Multi-mission (7.3m)'],
  },
  {
    id: -181, name: 'Troll Antarctica', lat: -72.012, lng: 2.535, alt: 1270,
    network: 'ksat', status: 'online', owner: 'KSAT',
    antennas: ['Multi-mission (7.3m)', 'Multi-mission (3.7m)'],
  },
  {
    id: -182, name: 'Punta Arenas', lat: -53.15, lng: -70.92, alt: 30,
    network: 'ksat', status: 'online', owner: 'KSAT',
    antennas: ['Multi-mission (7.3m)'],
  },
  {
    id: -183, name: 'Singapore KSAT', lat: 1.35, lng: 103.82, alt: 10,
    network: 'ksat', status: 'online', owner: 'KSAT',
    antennas: ['Multi-mission (7.3m)'],
  },
  {
    id: -184, name: 'Dubai KSAT', lat: 25.07, lng: 55.17, alt: 15,
    network: 'ksat', status: 'online', owner: 'KSAT',
    antennas: ['Multi-mission (7.3m)'],
  },
  {
    id: -185, name: 'Inuvik KSAT', lat: 68.35, lng: -133.7, alt: 100,
    network: 'ksat', status: 'online', owner: 'KSAT',
    antennas: ['Multi-mission (9m)'],
  },
  {
    id: -186, name: 'Mauritius KSAT', lat: -20.16, lng: 57.5, alt: 400,
    network: 'ksat', status: 'online', owner: 'KSAT',
    antennas: ['Multi-mission (7.3m)'],
  },
  {
    id: -187, name: 'Hawaiʻi KSAT', lat: 19.72, lng: -155.05, alt: 30,
    network: 'ksat', status: 'online', owner: 'KSAT',
    antennas: ['Multi-mission (9m)'],
  },

  // --- South America ---
  {
    id: -190, name: 'Cuiabá INPE', lat: -15.56, lng: -56.07, alt: 178,
    network: 'other', status: 'online', owner: 'INPE (Brazil)',
    antennas: ['Reception (10m)'],
  },
  {
    id: -191, name: 'Alcântara INPE', lat: -2.31, lng: -44.37, alt: 40,
    network: 'other', status: 'online', owner: 'INPE (Brazil)',
    antennas: ['Tracking (9m)'],
  },
  {
    id: -192, name: 'Natal INPE', lat: -5.84, lng: -35.21, alt: 50,
    network: 'other', status: 'online', owner: 'INPE (Brazil)',
    antennas: ['Reception (9m)'],
  },
  {
    id: -193, name: 'Córdoba CONAE', lat: -31.52, lng: -64.46, alt: 470,
    network: 'other', status: 'online', owner: 'CONAE (Argentina)',
    antennas: ['Tracking (13m)'],
  },
  {
    id: -194, name: 'Santiago SSC', lat: -33.15, lng: -70.67, alt: 520,
    network: 'other', status: 'online', owner: 'SSC (Sweden)',
    antennas: ['Multi-mission (9m)', 'Multi-mission (13m)'],
  },

  // --- Africa ---
  {
    id: -200, name: 'Hartebeesthoek', lat: -25.887, lng: 27.685, alt: 1391,
    network: 'other', status: 'online', owner: 'SANSA (South Africa)',
    antennas: ['HartRAO (26m)', 'S-band (10m)'],
  },
  {
    id: -201, name: 'Malindi Broglio', lat: -2.995, lng: 40.195, alt: 5,
    network: 'other', status: 'online', owner: 'ASI (Italy)',
    antennas: ['BSC (10m)'],
  },

  // --- Other notable stations ---
  {
    id: -210, name: 'Weilheim', lat: 47.8803, lng: 11.0822, alt: 565,
    network: 'other', status: 'online', owner: 'DLR (Germany)',
    antennas: ['WHM (30m)', 'WGS (9m)'],
  },
  {
    id: -211, name: 'Dongara', lat: -29.045, lng: 115.347, alt: 200,
    network: 'other', status: 'online', owner: 'SSC (Sweden/Australia)',
    antennas: ['Yatharaga (13m)'],
  },
  {
    id: -212, name: 'Prince Albert', lat: 53.21, lng: -105.93, alt: 490,
    network: 'other', status: 'online', owner: 'CSA (Canada)',
    antennas: ['PASS (10m)'],
  },
  {
    id: -213, name: 'McMurdo', lat: -77.846, lng: 166.669, alt: 50,
    network: 'other', status: 'online', owner: 'NASA (Antarctica)',
    antennas: ['TDRS (10m)'],
  },
  {
    id: -214, name: 'Guam', lat: 13.615, lng: 144.856, alt: 160,
    network: 'other', status: 'online', owner: 'US Space Force',
    antennas: ['AFSCN (12m)'],
  },
  {
    id: -215, name: 'Diego Garcia', lat: -7.32, lng: 72.42, alt: 5,
    network: 'other', status: 'online', owner: 'US Space Force',
    antennas: ['AFSCN (12m)'],
  },
  {
    id: -216, name: 'Ascension Island', lat: -7.97, lng: -14.39, alt: 200,
    network: 'other', status: 'online', owner: 'US Space Force',
    antennas: ['AFSCN (12m)'],
  },
  {
    id: -217, name: 'Kaena Point', lat: 21.561, lng: -158.253, alt: 91,
    network: 'other', status: 'online', owner: 'US Space Force (Hawaii)',
    antennas: ['AFSCN (12m)'],
  },
  {
    id: -218, name: 'Thule', lat: 76.531, lng: -68.703, alt: 77,
    network: 'other', status: 'online', owner: 'US Space Force (Greenland)',
    antennas: ['AFSCN (12m)'],
  },
  {
    id: -219, name: 'Vandenberg', lat: 34.756, lng: -120.521, alt: 115,
    network: 'other', status: 'online', owner: 'US Space Force',
    antennas: ['AFSCN (12m)'],
  },
  {
    id: -220, name: 'Cape Canaveral', lat: 28.489, lng: -80.578, alt: 5,
    network: 'other', status: 'online', owner: 'US Space Force',
    antennas: ['AFSCN (12m)'],
  },
  {
    id: -221, name: 'New Boston', lat: 42.948, lng: -71.628, alt: 300,
    network: 'other', status: 'online', owner: 'US Space Force',
    antennas: ['AFSCN (12m)'],
  },
  {
    id: -222, name: 'Daejeon', lat: 36.37, lng: 127.36, alt: 100,
    network: 'other', status: 'online', owner: 'KARI (South Korea)',
    antennas: ['Tracking (13m)'],
  },
  {
    id: -223, name: 'Guildford SSTL', lat: 51.243, lng: -0.589, alt: 60,
    network: 'other', status: 'online', owner: 'SSTL (UK)',
    antennas: ['S-band (5m)', 'X-band (3.7m)'],
  },
];
