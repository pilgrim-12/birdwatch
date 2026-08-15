import type { TLEData, Satellite } from '@/types/satellite';

export function parseTLEText(text: string): TLEData[] {
  const lines = text
    .trim()
    .split('\n')
    .map((l) => l.trim());
  const tles: TLEData[] = [];

  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i];
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];

    if (line1.startsWith('1 ') && line2.startsWith('2 ')) {
      tles.push({ name, line1, line2 });
    }
  }

  return tles;
}

export function extractNoradId(line2: string): number {
  return parseInt(line2.substring(2, 7).trim(), 10);
}

/**
 * Epoch of a TLE (line 1, columns 19-32: YYDDD.DDDDDDDD).
 * SGP4 accuracy degrades away from this moment, so the UI surfaces its age.
 */
export function parseTleEpoch(line1: string): Date | null {
  const raw = line1.substring(18, 32).trim();
  if (raw.length < 5) return null;
  const yy = parseInt(raw.substring(0, 2), 10);
  const dayOfYear = parseFloat(raw.substring(2));
  if (!Number.isFinite(yy) || !Number.isFinite(dayOfYear)) return null;
  // Two-digit years: 57-99 => 1957-1999, 00-56 => 2000-2056 (NORAD convention)
  const year = yy < 57 ? 2000 + yy : 1900 + yy;
  const jan1 = Date.UTC(year, 0, 1);
  return new Date(jan1 + (dayOfYear - 1) * 86_400_000);
}

export function tlesToSatellites(tles: TLEData[], group: string = 'active'): Satellite[] {
  return tles.map((tle) => ({
    id: extractNoradId(tle.line2),
    name: tle.name,
    tle,
    group,
    position: null,
  }));
}
