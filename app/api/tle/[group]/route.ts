import { NextRequest, NextResponse } from 'next/server';
import { CELESTRAK_BASE_URL, ALLOWED_GROUPS, type SatelliteGroup } from '@/lib/constants';
import { fetchByName } from '@/lib/spacetrack';
import { parseRecords, serialize, mergeMissing, isFresh, type TleRecord } from '@/lib/tleMerge';

export const revalidate = 3600; // 1 hour cache

/**
 * Served from Vercel's edge cache so a page load does not reach the function
 * at all: upstream load then scales with time, not with traffic, which is what
 * keeps us inside Space-Track's per-account rate limit. stale-while-revalidate
 * lets the edge answer instantly from the previous copy while it refreshes, so
 * an upstream outage degrades to slightly old elements instead of nothing.
 */
const CACHE_HEADERS = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
};

/** Failures must never be pinned at the edge — a bad minute would last an hour. */
const NO_CACHE = { 'Cache-Control': 'no-store' };

/**
 * Groups CelesTrak has no GROUP= feed for: we search the catalogue by name
 * instead. These are also the groups Space-Track can supplement, since it
 * indexes by object name too.
 */
const NAME_QUERIES: Record<string, string> = {
  noaa: 'NOAA',
  rassvet: 'RASSVET',
};

const isDebris = (r: TleRecord) => r.name.includes('DEB') || r.name.includes('R/B');

/** Launch year from the international designator in line 1, columns 10-11. */
function launchYear(line1: string): number {
  const yy = parseInt(line1.substring(9, 11), 10);
  return yy >= 57 ? 1900 + yy : 2000 + yy;
}

const GROUP_FILTERS: Record<string, (r: TleRecord) => boolean> = {
  // Keep modern NOAA weather satellites, drop debris and spent stages.
  noaa: (r) => !isDebris(r) && launchYear(r.line1) >= 1998,
  rassvet: (r) => !isDebris(r),
};

async function fetchCelestrak(query: string): Promise<Response> {
  return fetch(`${CELESTRAK_BASE_URL}?${query}&FORMAT=tle`, {
    next: { revalidate: 3600 },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ group: string }> },
) {
  const { group } = await params;

  if (!ALLOWED_GROUPS.includes(group as SatelliteGroup)) {
    return NextResponse.json(
      { error: `Invalid group. Allowed: ${ALLOWED_GROUPS.join(', ')}` },
      { status: 400, headers: NO_CACHE },
    );
  }

  // Supplementing costs an authenticated round trip, so it is opt-in per request.
  const useSpaceTrack = request.nextUrl.searchParams.get('st') === '1';
  const nameQuery = NAME_QUERIES[group];

  try {
    let text: string;

    if (nameQuery) {
      const response = await fetchCelestrak(`NAME=${encodeURIComponent(nameQuery)}`);
      if (!response.ok) {
        return NextResponse.json(
          { error: `CelesTrak returned ${response.status}` },
          { status: 502, headers: NO_CACHE },
        );
      }

      const keep = GROUP_FILTERS[group] ?? (() => true);
      const records = parseRecords(await response.text()).filter(keep);

      // Space-Track carries what CelesTrak's public feed omits — notably every
      // object numbered above 99999, which CelesTrak does not publish at all.
      let merged = records;
      if (useSpaceTrack) {
        const supplement = await fetchByName(nameQuery);
        if (supplement) {
          // Drop element sets too old to mean anything — decayed objects linger.
          const fresh = parseRecords(supplement).filter((r) => isFresh(r));
          merged = mergeMissing(records, fresh, keep);
        }
      }

      text = serialize(merged);
    } else {
      // Map internal group names to CelesTrak group names where they differ
      const CELESTRAK_NAME_MAP: Record<string, string> = {
        iridium: 'iridium-NEXT',
        sarsat: 'sarsat',
        tdrss: 'tdrss',
      };
      const celestrakGroup = CELESTRAK_NAME_MAP[group] ?? group;
      const response = await fetchCelestrak(`GROUP=${celestrakGroup}`);

      if (!response.ok) {
        return NextResponse.json(
          { error: `CelesTrak returned ${response.status}` },
          { status: 502, headers: NO_CACHE },
        );
      }

      text = await response.text();
    }

    return new NextResponse(text, { headers: CACHE_HEADERS });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch TLE data' },
      { status: 500, headers: NO_CACHE },
    );
  }
}
