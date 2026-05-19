export type RadioMode =
  | 'APT'
  | 'LRPT'
  | 'FM_VOICE'
  | 'SSB_LINEAR'
  | 'SSTV'
  | 'PACKET'
  | 'CW'
  | 'BPSK'
  | 'DSB'
  | 'BEACON'
  | 'AHRPT'
  | 'HRIT';

export type RadioStatus =
  | 'active'
  | 'inactive'
  | 'intermittent'
  | 'unavailable_for_rtlsdr';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface Downlink {
  frequencyHz: number;
  bandwidthHz: number;
  mode: RadioMode;
  description?: string;
}

export interface RadioProfile {
  noradId: number;
  status: RadioStatus;
  downlinks: Downlink[];
  difficulty: Difficulty;
  antenna: string;
  satdumpPipeline?: string;
  samplerateHz?: number;
  whatYouReceive: string;
  howToReceive: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Individual satellite profiles keyed by NORAD catalog number
// ---------------------------------------------------------------------------

const PROFILES: RadioProfile[] = [
  // ── NOAA APT (active) ──────────────────────────────────────────────────
  {
    noradId: 25338, // NOAA 15
    status: 'active',
    downlinks: [
      {
        frequencyHz: 137_620_000,
        bandwidthHz: 40_000,
        mode: 'APT',
        description: 'VHF APT analog weather imagery',
      },
    ],
    difficulty: 'easy',
    antenna: 'V-dipole 137 MHz (horizontal) or QFH',
    satdumpPipeline: 'noaa_apt',
    samplerateHz: 2_400_000,
    whatYouReceive:
      'Real-time analog APT cloud imagery — two side-by-side channels: visible and infrared. Swath width ~2900 km.',
    howToReceive:
      'V-dipole 137 MHz horizontal or QFH antenna. RTL-SDR tuned to 137.620 MHz, 40 kHz bandwidth, WFM mode. SatDump pipeline noaa_apt decodes automatically.',
  },
  {
    noradId: 28654, // NOAA 18
    status: 'active',
    downlinks: [
      {
        frequencyHz: 137_912_500,
        bandwidthHz: 40_000,
        mode: 'APT',
        description: 'VHF APT analog weather imagery',
      },
    ],
    difficulty: 'easy',
    antenna: 'V-dipole 137 MHz (horizontal) or QFH',
    satdumpPipeline: 'noaa_apt',
    samplerateHz: 2_400_000,
    whatYouReceive:
      'Real-time analog APT cloud imagery — two channels: visible and infrared. Swath width ~2900 km.',
    howToReceive:
      'V-dipole 137 MHz horizontal or QFH antenna. RTL-SDR tuned to 137.9125 MHz, 40 kHz bandwidth, WFM mode. SatDump pipeline noaa_apt.',
  },
  {
    noradId: 33591, // NOAA 19
    status: 'active',
    downlinks: [
      {
        frequencyHz: 137_100_000,
        bandwidthHz: 40_000,
        mode: 'APT',
        description: 'VHF APT analog weather imagery',
      },
    ],
    difficulty: 'easy',
    antenna: 'V-dipole 137 MHz (horizontal) or QFH',
    satdumpPipeline: 'noaa_apt',
    samplerateHz: 2_400_000,
    whatYouReceive:
      'Real-time analog APT cloud imagery — two channels: visible and infrared. Swath width ~2900 km.',
    howToReceive:
      'V-dipole 137 MHz horizontal or QFH antenna. RTL-SDR tuned to 137.100 MHz, 40 kHz bandwidth, WFM mode. SatDump pipeline noaa_apt.',
  },

  // ── NOAA APT (inactive / decommissioned) ───────────────────────────────
  {
    noradId: 26536, // NOAA 16
    status: 'inactive',
    downlinks: [
      {
        frequencyHz: 137_625_000,
        bandwidthHz: 40_000,
        mode: 'APT',
        description: 'VHF APT (decommissioned 2014)',
      },
    ],
    difficulty: 'easy',
    antenna: 'V-dipole 137 MHz',
    satdumpPipeline: 'noaa_apt',
    whatYouReceive: 'Nothing — satellite decommissioned in 2014, transmitter off.',
    howToReceive: 'Reception not possible — satellite is inactive.',
    notes: 'Decommissioned June 9, 2014. Broke apart in orbit November 25, 2015.',
  },
  {
    noradId: 27453, // NOAA 17
    status: 'inactive',
    downlinks: [
      {
        frequencyHz: 137_500_000,
        bandwidthHz: 40_000,
        mode: 'APT',
        description: 'VHF APT (decommissioned 2013)',
      },
    ],
    difficulty: 'easy',
    antenna: 'V-dipole 137 MHz',
    satdumpPipeline: 'noaa_apt',
    whatYouReceive: 'Nothing — satellite decommissioned in 2013, transmitter off.',
    howToReceive: 'Reception not possible — satellite is inactive.',
    notes: 'Decommissioned April 10, 2013 due to AVHRR scanner degradation.',
  },

  // ── NOAA JPSS (X-band, unavailable for RTL-SDR) ────────────────────────
  {
    noradId: 43013, // NOAA 20 (JPSS-1)
    status: 'unavailable_for_rtlsdr',
    downlinks: [
      {
        frequencyHz: 7_812_000_000,
        bandwidthHz: 30_000_000,
        mode: 'AHRPT',
        description: 'X-band HRD downlink',
      },
    ],
    difficulty: 'expert',
    antenna: '1.8 m parabolic dish + X-band LNB',
    whatYouReceive:
      'High-resolution imagery from VIIRS, CrIS, ATMS instruments — HRD (High Rate Data) format. Resolution down to 375 m.',
    howToReceive:
      'Requires ~1.8 m parabolic dish, X-band converter (7–8 GHz), specialized receiver. RTL-SDR cannot handle the frequency or bandwidth.',
    notes: 'X-band 7812 MHz. Requires professional ground station.',
  },
  {
    noradId: 54234, // NOAA 21 (JPSS-2)
    status: 'unavailable_for_rtlsdr',
    downlinks: [
      {
        frequencyHz: 7_812_000_000,
        bandwidthHz: 30_000_000,
        mode: 'AHRPT',
        description: 'X-band HRD downlink',
      },
    ],
    difficulty: 'expert',
    antenna: '1.8 m parabolic dish + X-band LNB',
    whatYouReceive:
      'High-resolution VIIRS, CrIS, ATMS imagery — HRD format. Similar to NOAA 20.',
    howToReceive:
      'Professional ground station with X-band antenna. RTL-SDR not suitable.',
    notes: 'X-band 7812 MHz. Launched November 10, 2022.',
  },

  // ── Meteor-M (LRPT) ───────────────────────────────────────────────────
  {
    noradId: 57166, // Meteor-M N2-3
    status: 'active',
    downlinks: [
      {
        frequencyHz: 137_900_000,
        bandwidthHz: 150_000,
        mode: 'LRPT',
        description: 'VHF LRPT digital weather imagery',
      },
    ],
    difficulty: 'easy',
    antenna: 'V-dipole 137 MHz (horizontal) or QFH',
    satdumpPipeline: 'meteor_m2-x_lrpt',
    samplerateHz: 2_400_000,
    whatYouReceive:
      'Digital LRPT cloud imagery (MSU-MR) — color, 1 km resolution. Higher quality than NOAA APT. Three channels simultaneously.',
    howToReceive:
      'V-dipole 137 MHz or QFH antenna. RTL-SDR tuned to 137.9 MHz, 150 kHz bandwidth. SatDump pipeline meteor_m2-x_lrpt. QPSK signal — requires good SNR (>5 dB).',
    notes:
      'LRPT is sometimes disabled for maintenance. Check status on r/amateursatellites.',
  },
  {
    noradId: 59051, // Meteor-M N2-4
    status: 'active',
    downlinks: [
      {
        frequencyHz: 137_100_000,
        bandwidthHz: 150_000,
        mode: 'LRPT',
        description: 'VHF LRPT digital weather imagery',
      },
    ],
    difficulty: 'easy',
    antenna: 'V-dipole 137 MHz (horizontal) or QFH',
    satdumpPipeline: 'meteor_m2-x_lrpt',
    samplerateHz: 2_400_000,
    whatYouReceive:
      'Digital LRPT cloud imagery (MSU-MR) — color, 1 km resolution, three channels simultaneously.',
    howToReceive:
      'V-dipole 137 MHz or QFH antenna. RTL-SDR tuned to 137.1 MHz, 150 kHz bandwidth. SatDump pipeline meteor_m2-x_lrpt.',
    notes:
      'Launched February 29, 2024. Frequency 137.1 MHz overlaps with NOAA 19 APT — possible interference during simultaneous passes.',
  },

  // ── ISS ────────────────────────────────────────────────────────────────
  {
    noradId: 25544, // ISS (ZARYA)
    status: 'intermittent',
    downlinks: [
      {
        frequencyHz: 145_800_000,
        bandwidthHz: 15_000,
        mode: 'SSTV',
        description: 'SSTV (Slow Scan TV) — during ARISS events',
      },
      {
        frequencyHz: 145_825_000,
        bandwidthHz: 15_000,
        mode: 'PACKET',
        description: 'Packet radio AX.25 / APRS digipeater',
      },
    ],
    difficulty: 'easy',
    antenna: 'Any 2-meter antenna (even a whip)',
    whatYouReceive:
      'SSTV images in PD120/PD180 mode during special sessions (ARISS events, a few times per year). Packet radio AX.25 on 145.825 MHz is active more often.',
    howToReceive:
      'Any 144 MHz antenna. RTL-SDR tuned to 145.800 MHz, NFM, 15 kHz bandwidth. Doppler ±3.5 kHz — may need manual tuning. SSTV decoder: MMSSTV, QSSTV, or Robot36 (Android).',
    notes:
      'SSTV is enabled during special events — check ARISS schedule. Packet/APRS on 145.825 runs continuously.',
  },

  // ── Amateur satellites ─────────────────────────────────────────────────
  {
    noradId: 43017, // AO-91 (RadFxSat / Fox-1B)
    status: 'active',
    downlinks: [
      {
        frequencyHz: 145_960_000,
        bandwidthHz: 15_000,
        mode: 'FM_VOICE',
        description: 'FM voice repeater downlink',
      },
    ],
    difficulty: 'medium',
    antenna: '2-meter Yagi or Arrow II',
    whatYouReceive:
      'FM voice repeater — listen to ham radio QSOs through the satellite in real time. Uplink 435.250 MHz (67 Hz CTCSS).',
    howToReceive:
      'Directional 144 MHz antenna (Yagi, Arrow II). RTL-SDR tuned to 145.960 MHz, NFM, 12 kHz bandwidth. Doppler ±3 kHz. Transmitting requires a ham radio license.',
    notes:
      'Fox-1B. Light-activated (solar panels). May be off when in Earth shadow.',
  },
  {
    noradId: 27607, // SO-50 (SaudiSat-1C)
    status: 'active',
    downlinks: [
      {
        frequencyHz: 436_795_000,
        bandwidthHz: 15_000,
        mode: 'FM_VOICE',
        description: 'UHF FM voice repeater downlink',
      },
    ],
    difficulty: 'medium',
    antenna: '70 cm Yagi or Arrow II dual-band',
    whatYouReceive:
      'UHF FM voice repeater — listen to ham QSOs through the satellite. Uplink 145.850 MHz (67 Hz CTCSS, 74.4 Hz to activate).',
    howToReceive:
      'Directional 430 MHz antenna (70 cm Yagi). RTL-SDR tuned to 436.795 MHz, NFM. Doppler ±10 kHz on UHF — significant, needs tracking.',
    notes:
      'One of the oldest amateur satellites (2002). Activation requires a 74.4 Hz tone for 2 seconds before use.',
  },
  {
    noradId: 39444, // AO-73 (FUNcube-1)
    status: 'active',
    downlinks: [
      {
        frequencyHz: 145_935_000,
        bandwidthHz: 20_000,
        mode: 'BPSK',
        description: 'BPSK telemetry 1200 bps',
      },
    ],
    difficulty: 'medium',
    antenna: '2-meter Yagi or QFH 145 MHz',
    whatYouReceive:
      'BPSK 1200 baud telemetry — satellite health data, temperatures, voltages, science data. Also has a linear SSB/CW transponder (29.4–29.5 / 145.95–145.97 MHz).',
    howToReceive:
      '144 MHz antenna. RTL-SDR tuned to 145.935 MHz, USB, 20 kHz bandwidth. Decoder: FUNcube Dashboard (free). Telemetry is auto-uploaded to Data Warehouse.',
    notes:
      'In autonomous mode it transmits telemetry. When the operator activates the transponder it switches to SSB/CW mode.',
  },
  {
    noradId: 43700, // QO-100 (Es'hail-2)
    status: 'active',
    downlinks: [
      {
        frequencyHz: 10_489_750_000,
        bandwidthHz: 500_000,
        mode: 'SSB_LINEAR',
        description: 'Narrowband transponder (SSB/CW)',
      },
    ],
    difficulty: 'hard',
    antenna: '60–80 cm parabolic dish + PLL LNB',
    whatYouReceive:
      'Amateur SSB/CW transponder on a geostationary satellite (25.9°E) — listen to ham QSOs from Europe, Africa, and the Middle East 24/7. No pass windows needed.',
    howToReceive:
      '60–80 cm parabolic dish with PLL LNB tuned to 10489.5–10490 MHz. Bias-tee to power LNB + RTL-SDR. IF ~739 MHz. SDR# or GQRX, USB mode.',
    notes:
      'Geostationary — always visible, no need to wait for a pass. Requires precise LNB alignment (linear polarization).',
  },
  {
    noradId: 43803, // JY1SAT (JO-97)
    status: 'intermittent',
    downlinks: [
      {
        frequencyHz: 145_840_000,
        bandwidthHz: 15_000,
        mode: 'FM_VOICE',
        description: 'FM voice transponder / SSDV downlink',
      },
    ],
    difficulty: 'medium',
    antenna: '2-meter Yagi',
    whatYouReceive:
      'FM voice repeater and SSDV images from the onboard camera. First Jordanian satellite.',
    howToReceive:
      'Directional 144 MHz antenna. RTL-SDR tuned to 145.840 MHz, NFM. SSDV decoded with specialized software.',
    notes:
      'Operates intermittently — may be inactive for extended periods.',
  },
  {
    noradId: 40908, // LilacSat-2 (CAS-3H)
    status: 'inactive',
    downlinks: [
      {
        frequencyHz: 437_200_000,
        bandwidthHz: 15_000,
        mode: 'FM_VOICE',
        description: 'UHF FM voice transponder',
      },
    ],
    difficulty: 'medium',
    antenna: '70 cm Yagi',
    whatYouReceive:
      'Nothing — satellite is presumed inactive (launched 2015).',
    howToReceive: 'Reception unlikely — satellite has been unresponsive for years.',
    notes: 'CAS-3H. Launched in 2015, expected lifespan was 1–2 years.',
  },

  // ── MetOp (L-band AHRPT) ──────────────────────────────────────────────
  {
    noradId: 38771, // MetOp-B
    status: 'active',
    downlinks: [
      {
        frequencyHz: 1_701_300_000,
        bandwidthHz: 4_500_000,
        mode: 'AHRPT',
        description: 'L-band AHRPT digital imagery',
      },
    ],
    difficulty: 'hard',
    antenna: '80–120 cm parabolic dish + L-band LNA + feed',
    satdumpPipeline: 'metop_ahrpt',
    samplerateHz: 6_000_000,
    whatYouReceive:
      'High-resolution digital AVHRR/3 imagery — 6 channels, 1 km resolution. Plus IASI, MHS, AMSU data.',
    howToReceive:
      '80+ cm parabolic dish with L-band patch feed. SAWbird+ GOES LNA. RTL-SDR with bias-tee at 1701.3 MHz, samplerate 6 MSPS. SatDump pipeline metop_ahrpt.',
    notes:
      'L-band 1701.3 MHz. Requires motorized or manual antenna tracking.',
  },
  {
    noradId: 43689, // MetOp-C
    status: 'active',
    downlinks: [
      {
        frequencyHz: 1_701_300_000,
        bandwidthHz: 4_500_000,
        mode: 'AHRPT',
        description: 'L-band AHRPT digital imagery',
      },
    ],
    difficulty: 'hard',
    antenna: '80–120 cm parabolic dish + L-band LNA + feed',
    satdumpPipeline: 'metop_ahrpt',
    samplerateHz: 6_000_000,
    whatYouReceive:
      'High-resolution digital AVHRR/3 imagery — 6 channels, 1 km resolution.',
    howToReceive:
      'Same as MetOp-B: 80+ cm parabolic dish, L-band LNA, RTL-SDR with bias-tee, SatDump metop_ahrpt.',
    notes: 'L-band 1701.3 MHz. Launched November 7, 2018.',
  },

  // ── GOES (L-band HRIT/EMWIN) ──────────────────────────────────────────
  {
    noradId: 41866, // GOES-16
    status: 'active',
    downlinks: [
      {
        frequencyHz: 1_694_100_000,
        bandwidthHz: 2_400_000,
        mode: 'HRIT',
        description: 'L-band HRIT/EMWIN downlink',
      },
    ],
    difficulty: 'hard',
    antenna: '100+ cm parabolic dish + SAWbird+ GOES LNA',
    satdumpPipeline: 'goes_hrit',
    samplerateHz: 6_000_000,
    whatYouReceive:
      'Full-disk Earth images from geostationary orbit every 10 minutes — visible, IR, water vapor. Also EMWIN weather alert data.',
    howToReceive:
      '1 m+ parabolic dish, SAWbird+ GOES LNA, RTL-SDR with bias-tee. Antenna pointed at fixed position (geostationary). SatDump pipeline goes_hrit.',
    notes:
      'Geostationary (75.2°W) — visible from the Americas. Not visible from Europe/Asia.',
  },
  {
    noradId: 43226, // GOES-17
    status: 'active',
    downlinks: [
      {
        frequencyHz: 1_694_100_000,
        bandwidthHz: 2_400_000,
        mode: 'HRIT',
        description: 'L-band HRIT/EMWIN downlink',
      },
    ],
    difficulty: 'hard',
    antenna: '100+ cm parabolic dish + SAWbird+ GOES LNA',
    satdumpPipeline: 'goes_hrit',
    samplerateHz: 6_000_000,
    whatYouReceive: 'Same as GOES-16 — full-disk geostationary imagery.',
    howToReceive: 'Same as GOES-16. Fixed antenna aimed at geostationary position.',
    notes:
      'Geostationary (137.2°W). In on-orbit storage since 2023.',
  },
  {
    noradId: 51850, // GOES-18
    status: 'active',
    downlinks: [
      {
        frequencyHz: 1_694_100_000,
        bandwidthHz: 2_400_000,
        mode: 'HRIT',
        description: 'L-band HRIT/EMWIN downlink',
      },
    ],
    difficulty: 'hard',
    antenna: '100+ cm parabolic dish + SAWbird+ GOES LNA',
    satdumpPipeline: 'goes_hrit',
    samplerateHz: 6_000_000,
    whatYouReceive:
      'Full-disk Earth images every 10 minutes (replacement for GOES-17).',
    howToReceive: 'Same as GOES-16. Fixed antenna aimed at geostationary position.',
    notes: 'Geostationary (136.9°W). Not visible from Europe/Asia.',
  },
];

// ---------------------------------------------------------------------------
// Group-level generic profiles (for constellations with many satellites)
// ---------------------------------------------------------------------------

const GROUP_PROFILES: Record<string, Omit<RadioProfile, 'noradId'>> = {
  'gps-ops': {
    status: 'unavailable_for_rtlsdr',
    downlinks: [
      {
        frequencyHz: 1_575_420_000,
        bandwidthHz: 2_000_000,
        mode: 'BEACON',
        description: 'L1 C/A navigation signal (1575.42 MHz)',
      },
    ],
    difficulty: 'expert',
    antenna: 'GPS L1 patch antenna + LNA + SAW filter',
    whatYouReceive:
      'GPS L1 navigation signal — pseudorandom code and navigation message. Can decode ephemeris, almanac, UTC time.',
    howToReceive:
      'L1 1575.42 MHz patch antenna + LNA + SAW filter. RTL-SDR can pick up the signal (below noise floor), but decoding requires specialized software (gnss-sdr). Expert level.',
    notes:
      'GPS signal is below the noise floor (~-130 dBm). Decoding uses correlation with known PRN codes.',
  },
  'glo-ops': {
    status: 'unavailable_for_rtlsdr',
    downlinks: [
      {
        frequencyHz: 1_602_000_000,
        bandwidthHz: 8_000_000,
        mode: 'BEACON',
        description: 'L1 FDMA navigation signal (~1602 MHz)',
      },
    ],
    difficulty: 'expert',
    antenna: 'GLONASS L1 patch antenna + LNA',
    whatYouReceive:
      'GLONASS L1 navigation signal — FDMA, each satellite on its own frequency (1598.0625–1605.375 MHz).',
    howToReceive:
      'Same as GPS — patch antenna, LNA, GNSS-SDR. Unique feature: FDMA instead of CDMA, different frequencies for different satellites.',
    notes:
      'FDMA: frequency = 1602 + k×0.5625 MHz, where k is the satellite frequency channel number.',
  },
  galileo: {
    status: 'unavailable_for_rtlsdr',
    downlinks: [
      {
        frequencyHz: 1_575_420_000,
        bandwidthHz: 4_000_000,
        mode: 'BEACON',
        description: 'E1 navigation signal (1575.42 MHz)',
      },
    ],
    difficulty: 'expert',
    antenna: 'L1 patch antenna + LNA',
    whatYouReceive:
      'Galileo E1 navigation signal — CBOC modulation. Shares GPS L1 frequency.',
    howToReceive:
      'Same antenna as GPS L1. GNSS-SDR supports Galileo E1. More complex modulation (CBOC) than GPS.',
    notes: 'European navigation system. Full constellation — 30 satellites.',
  },
  beidou: {
    status: 'unavailable_for_rtlsdr',
    downlinks: [
      {
        frequencyHz: 1_561_098_000,
        bandwidthHz: 4_000_000,
        mode: 'BEACON',
        description: 'B1I navigation signal (1561.098 MHz)',
      },
    ],
    difficulty: 'expert',
    antenna: 'L-band patch antenna + LNA',
    whatYouReceive:
      'BeiDou B1I navigation signal — BPSK modulation. Chinese navigation system.',
    howToReceive:
      'L-band patch antenna + LNA. GNSS-SDR supports BeiDou B1I. Requires wideband frontend.',
    notes: 'Chinese system. 35+ satellites (MEO + GEO + IGSO).',
  },
  starlink: {
    status: 'unavailable_for_rtlsdr',
    downlinks: [
      {
        frequencyHz: 11_325_000_000,
        bandwidthHz: 250_000_000,
        mode: 'BEACON',
        description: 'Ku-band user downlink (~11 GHz)',
      },
    ],
    difficulty: 'expert',
    antenna: 'Starlink phased array (proprietary)',
    whatYouReceive:
      'Ku-band broadband internet traffic. Encrypted, proprietary protocol — nothing useful for amateur reception.',
    howToReceive:
      'Not possible with RTL-SDR. Ku-band 10.7–12.7 GHz requires phased array with beam forming. Proprietary protocol.',
    notes: 'Starlink is a commercial SpaceX system. Amateur reception is not possible.',
  },
};

// ---------------------------------------------------------------------------
// Lookup maps
// ---------------------------------------------------------------------------

const profileMap = new Map<number, RadioProfile>();
for (const p of PROFILES) {
  profileMap.set(p.noradId, p);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getRadioProfile(noradId: number): RadioProfile | undefined {
  return profileMap.get(noradId);
}

export function getGroupRadioProfile(
  group: string,
): Omit<RadioProfile, 'noradId'> | undefined {
  return GROUP_PROFILES[group];
}

export function isReceivable(noradId: number): boolean {
  const p = profileMap.get(noradId);
  if (!p) return false;
  return p.status === 'active' || p.status === 'intermittent';
}

export function getModeColor(mode: RadioMode): string {
  switch (mode) {
    case 'APT':
      return 'bg-green-500/20 text-green-300 border border-green-500/30';
    case 'LRPT':
      return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
    case 'FM_VOICE':
      return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
    case 'SSTV':
      return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
    case 'SSB_LINEAR':
      return 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30';
    case 'HRIT':
    case 'AHRPT':
      return 'bg-teal-500/20 text-teal-300 border border-teal-500/30';
    default:
      return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
  }
}

export function getStatusColor(status: RadioStatus): string {
  switch (status) {
    case 'active':
      return 'text-green-400';
    case 'inactive':
      return 'text-red-400';
    case 'intermittent':
      return 'text-yellow-400';
    case 'unavailable_for_rtlsdr':
      return 'text-gray-500';
  }
}

export function getDifficultyLabel(d: Difficulty): string {
  switch (d) {
    case 'easy':
      return 'Easy';
    case 'medium':
      return 'Medium';
    case 'hard':
      return 'Hard';
    case 'expert':
      return 'Expert';
  }
}

export function getDifficultyColor(d: Difficulty): string {
  switch (d) {
    case 'easy':
      return 'text-green-400';
    case 'medium':
      return 'text-yellow-400';
    case 'hard':
      return 'text-orange-400';
    case 'expert':
      return 'text-red-400';
  }
}

function getBandLabel(frequencyHz: number): string {
  if (frequencyHz >= 10_000_000_000) return 'Ku-band';
  if (frequencyHz >= 7_000_000_000) return 'X-band';
  if (frequencyHz >= 1_000_000_000) return 'L-band';
  if (frequencyHz >= 400_000_000) return 'UHF';
  return 'VHF';
}

export function getUnavailableBandLabel(profile: RadioProfile): string {
  if (profile.downlinks.length === 0) return 'N/A';
  return getBandLabel(profile.downlinks[0].frequencyHz);
}
