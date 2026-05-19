export interface AntennaType {
  id: string;
  name: string;
  imageUrl: string;
  imageAlt: string;
  bands: string;
  difficulty: 1 | 2 | 3 | 4;
  cost: string;
  description: string;
  usedFor: string;
  buildTips: string;
}

export const ANTENNA_TYPES: AntennaType[] = [
  {
    id: 'v-dipole',
    name: 'V-Dipole',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Yagi_3_element.svg/500px-Yagi_3_element.svg.png',
    imageAlt: 'Dipole antenna element diagram',
    bands: '137 MHz (VHF)',
    difficulty: 1,
    cost: '$5–15 DIY',
    description:
      'The simplest satellite antenna — two wire elements arranged in a V-shape at ~120° apart. Receives RHCP weather satellite signals with acceptable quality. A great first antenna for beginners.',
    usedFor: 'NOAA 15/18/19, Meteor-M N2-3/N2-4 (APT & LRPT weather imagery)',
    buildTips:
      'Cut two lengths of copper wire to 53.4 cm each (quarter-wave at 137 MHz). Mount them in a V at 120° with the opening pointing up. Connect to coax via a balun or directly to an RTL-SDR. Place outdoors with a clear view of the sky.',
  },
  {
    id: 'qfh',
    name: 'QFH (Quadrifilar Helix)',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Helical_antenna.jpg/400px-Helical_antenna.jpg',
    imageAlt: 'Helical antenna similar to QFH design',
    bands: '137 MHz (VHF)',
    difficulty: 2,
    cost: '$15–40 DIY',
    description:
      'Four helically-wound loops producing native circular polarization — ideal for weather satellites. Offers horizon-to-horizon coverage with better signal quality than a V-dipole, especially at low elevations.',
    usedFor: 'NOAA 15/18/19, Meteor-M N2-3/N2-4 (APT & LRPT weather imagery)',
    buildTips:
      'Build from copper or brass tubing/wire. Use an online QFH calculator for your exact frequency. The two loops must be offset by 90° and differ slightly in length for circular polarization. Mount vertically outdoors, elevated above obstructions.',
  },
  {
    id: 'yagi',
    name: 'Yagi-Uda',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/a/a7/Yagi_uda_antenna.jpg',
    imageAlt: 'Yagi-Uda directional antenna',
    bands: '144 MHz / 430 MHz (VHF/UHF)',
    difficulty: 2,
    cost: '$20–80',
    description:
      'A directional beam antenna with one driven element, a reflector, and one or more directors. High gain in a narrow beam makes it ideal for tracking amateur satellites, but requires manual pointing during a pass.',
    usedFor: 'AO-73 (FUNcube-1), JY1SAT (JO-97), LilacSat-2, SO-50',
    buildTips:
      'A 3–5 element Yagi on a boom works well for satellite work. For 2-meter (144 MHz), elements are about 1 m long. For 70 cm (430 MHz), elements are ~33 cm. Point the antenna at the satellite and track it across the sky during each pass.',
  },
  {
    id: 'arrow-ii',
    name: 'Arrow II Dual-Band',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/4/42/Two_meter_yagi.jpg',
    imageAlt: 'Two-meter Yagi antenna used for satellite work',
    bands: '144 / 430 MHz (VHF + UHF)',
    difficulty: 1,
    cost: '$80–140 (buy)',
    description:
      'A commercially made portable handheld Yagi covering both 2-meter and 70-cm bands simultaneously. Lightweight, collapsible, and designed specifically for amateur satellite work. The easiest way to work FM amateur satellites.',
    usedFor: 'AO-91 (Fox-1B), SO-50 (SaudiSat-1C)',
    buildTips:
      'Buy the Arrow II antenna kit — it assembles in minutes with no tools. Connect it to a dual-band handheld (e.g. Baofeng UV-5R) and aim it at the satellite. Use full-duplex if possible to hear your own downlink.',
  },
  {
    id: 'dish',
    name: 'Parabolic Dish',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Erdfunkstelle_Raisting_2.jpg/500px-Erdfunkstelle_Raisting_2.jpg',
    imageAlt: 'Parabolic dish antenna for satellite reception',
    bands: 'L-band / S-band / X-band / Ku-band',
    difficulty: 3,
    cost: '$100–500+',
    description:
      'A parabolic reflector that focuses radio waves onto a feed at the focal point. Required for higher-frequency satellite signals (L-band and above). Larger dishes provide more gain — 60 cm is a minimum for most LEO satellites, 1+ meters for HRPT/GOES.',
    usedFor: 'QO-100 (Es\'hail-2), MetOp-B/C (HRPT), GOES-16/17/18 (HRIT), NOAA-20/21 (HRD)',
    buildTips:
      'Repurpose an old satellite TV dish (60–120 cm). Add an appropriate LNB or LNA+feed for your target frequency. For L-band HRPT, use a helix or patch feed with an LNA (e.g. SAWbird). A motorized mount or manual tracking is needed for LEO passes.',
  },
  {
    id: 'patch',
    name: 'Patch Antenna',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Patch_antenna_w_cutaway.gif/500px-Patch_antenna_w_cutaway.gif',
    imageAlt: 'Patch antenna cutaway diagram showing layers',
    bands: 'L1 / L2 (1.2–1.6 GHz)',
    difficulty: 2,
    cost: '$15–60',
    description:
      'A flat, low-profile antenna made from a metal patch on a ground plane. Used primarily for GNSS reception (GPS, GLONASS, Galileo, BeiDou). Provides hemispherical coverage with circular polarization when properly designed.',
    usedFor: 'GPS, GLONASS, Galileo, BeiDou (navigation satellites)',
    buildTips:
      'For GNSS experimentation, buy a pre-made active patch antenna with built-in LNA and SAW filter (L1 1575.42 MHz). These are inexpensive and connect directly to an RTL-SDR. Mount with a clear sky view, ground plane facing down.',
  },
  {
    id: 'whip',
    name: 'Whip / Rubber Duck',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Baofeng_UV-5R_transceiver.jpg/400px-Baofeng_UV-5R_transceiver.jpg',
    imageAlt: 'Baofeng UV-5R handheld radio with whip antenna',
    bands: '144 MHz (VHF)',
    difficulty: 1,
    cost: '$0–25',
    description:
      'The simplest omnidirectional antenna — a flexible quarter-wave wire or rubber-coated element. Low gain but requires no aiming. Sufficient for strong signals like ISS APRS packets and ISS voice contacts during overhead passes.',
    usedFor: 'ISS (APRS digipeater, voice contacts, SSTV)',
    buildTips:
      'Any 2-meter rubber duck antenna on a handheld radio works for ISS. For better results, upgrade to a quarter-wave whip (about 50 cm for 144 MHz). Listen on 145.800 MHz for ISS APRS and voice. Go outdoors for best reception.',
  },
];

/** Map a radio profile antenna string to matching antenna guide IDs */
export function matchAntennaTypes(antennaString: string): string[] {
  const s = antennaString.toLowerCase();
  const matches: string[] = [];
  if (s.includes('v-dipole') || s.includes('v dipole')) matches.push('v-dipole');
  if (s.includes('qfh') || s.includes('quadrifilar')) matches.push('qfh');
  if (s.includes('arrow')) matches.push('arrow-ii');
  else if (s.includes('yagi')) matches.push('yagi');
  if (s.includes('parabolic') || s.includes('dish')) matches.push('dish');
  if (s.includes('patch')) matches.push('patch');
  if (s.includes('whip') || s.includes('rubber')) matches.push('whip');
  if (s.includes('any 2-meter') || s.includes('any 2 meter')) matches.push('whip');
  if (matches.length === 0 && s.includes('phased array')) matches.push('dish');
  return matches;
}
