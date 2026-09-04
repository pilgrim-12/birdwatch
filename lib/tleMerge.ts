/** Three-line TLE record: name plus the two element lines. */
export interface TleRecord {
  name: string;
  line1: string;
  line2: string;
}

export function parseRecords(text: string): TleRecord[] {
  const lines = text.split('\n').map((l) => l.trimEnd());
  const out: TleRecord[] = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i]?.trim();
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];
    if (!name || !line1?.startsWith('1 ') || !line2?.startsWith('2 ')) continue;
    out.push({ name, line1, line2 });
  }
  return out;
}

/**
 * Catalog number exactly as written in the TLE, kept as a string so Alpha-5
 * numbers ("A0083" = 100083) stay distinct without being decoded here.
 */
export const catalogKey = (r: TleRecord) => r.line2.substring(2, 7).trim();

export const serialize = (records: TleRecord[]) =>
  records.map((r) => `${r.name}\n${r.line1}\n${r.line2}`).join('\n');

/**
 * Append records the primary source does not already have. The primary wins on
 * conflict, so a supplement can only ever add objects, never restate them.
 */
export function mergeMissing(
  primary: TleRecord[],
  supplement: TleRecord[],
  keep: (r: TleRecord) => boolean = () => true,
): TleRecord[] {
  const seen = new Set(primary.map(catalogKey));
  const merged = [...primary];
  for (const record of supplement) {
    const key = catalogKey(record);
    if (!key || seen.has(key) || !keep(record)) continue;
    seen.add(key);
    merged.push(record);
  }
  return merged;
}

/**
 * Whether a record's elements are recent enough to propagate. Space-Track
 * keeps the last element set of a decayed object forever — RASSVET-3 4 still
 * resolves, frozen at its re-entry — and propagating that puts a ghost on the
 * globe. CelesTrak drops such objects itself, so this guards the supplement.
 */
export function isFresh(r: TleRecord, maxAgeDays = 30, now: number = Date.now()): boolean {
  const raw = r.line1.substring(18, 32).trim();
  if (raw.length < 5) return false;
  const yy = parseInt(raw.substring(0, 2), 10);
  const dayOfYear = parseFloat(raw.substring(2));
  if (!Number.isFinite(yy) || !Number.isFinite(dayOfYear)) return false;
  const year = yy >= 57 ? 1900 + yy : 2000 + yy;
  const epochMs = Date.UTC(year, 0, 1) + (dayOfYear - 1) * 86_400_000;
  return now - epochMs <= maxAgeDays * 86_400_000;
}
