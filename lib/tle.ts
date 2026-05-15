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

export function tlesToSatellites(tles: TLEData[]): Satellite[] {
  return tles.map((tle) => ({
    id: extractNoradId(tle.line2),
    name: tle.name,
    tle,
    position: null,
  }));
}
