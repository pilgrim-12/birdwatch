import { GROUP_INFO, type SatelliteGroup } from '@/lib/constants';

/** Map GROUP_INFO country tokens → ISO 3166-1 alpha-2 codes (used by flag-icons) */
export const COUNTRY_FLAG_MAP: Record<string, string | null> = {
  USA: 'us',
  Russia: 'ru',
  China: 'cn',
  EU: 'eu',
  UK: 'gb',
  France: 'fr',
  Luxembourg: 'lu',
  Canada: 'ca',
  Finland: 'fi',
  Italy: 'it',
  Japan: 'jp',
  International: null,
};

/** Split compound country string like "UK / France" into individual tokens */
export function parseCountryTokens(country: string): string[] {
  return country
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Get ISO flag codes for a country string. Returns null for "International". */
export function getCountryIsoCodes(country: string): (string | null)[] {
  const tokens = parseCountryTokens(country);
  return tokens.map((t) => COUNTRY_FLAG_MAP[t] ?? null);
}

/** Get sorted unique country tokens from all GROUP_INFO entries */
export function getUniqueCountries(): string[] {
  const set = new Set<string>();
  for (const info of Object.values(GROUP_INFO)) {
    for (const token of parseCountryTokens(info.country)) {
      set.add(token);
    }
  }
  return [...set].sort((a, b) => {
    if (a === 'International') return 1;
    if (b === 'International') return -1;
    return a.localeCompare(b);
  });
}

/** Check if a group belongs to a given country */
export function groupMatchesCountry(group: string, country: string): boolean {
  const info = GROUP_INFO[group as SatelliteGroup];
  if (!info) return false;
  return parseCountryTokens(info.country).includes(country);
}

/** Get primary ISO code for a satellite group */
export function getGroupPrimaryIsoCode(group: string): string | null {
  const info = GROUP_INFO[group as SatelliteGroup];
  if (!info) return null;
  const codes = getCountryIsoCodes(info.country);
  return codes.find((c) => c !== null) ?? null;
}

/** Preloaded flag Image cache for canvas rendering */
const flagImageCache = new Map<string, HTMLImageElement>();
let flagImagesLoading = false;

/** Load all needed flag images for canvas rendering. Returns cached map. */
export function loadFlagImages(): Map<string, HTMLImageElement> {
  if (flagImagesLoading || flagImageCache.size > 0) return flagImageCache;
  flagImagesLoading = true;
  const codes = Object.values(COUNTRY_FLAG_MAP).filter((c): c is string => c !== null);
  for (const code of codes) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = `https://flagcdn.com/w40/${code}.png`;
    img.onload = () => flagImageCache.set(code, img);
    // Pre-set so we know the code is being loaded
  }
  return flagImageCache;
}
