import { NextRequest, NextResponse } from 'next/server';
import { CELESTRAK_BASE_URL, ALLOWED_GROUPS, type SatelliteGroup } from '@/lib/constants';

export const revalidate = 3600; // 1 hour cache

// NOAA operational satellites by NORAD catalog number
const NOAA_CATNRS = [25338, 28654, 33591]; // NOAA 15, 18, 19

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ group: string }> },
) {
  const { group } = await params;

  if (!ALLOWED_GROUPS.includes(group as SatelliteGroup)) {
    return NextResponse.json(
      { error: `Invalid group. Allowed: ${ALLOWED_GROUPS.join(', ')}` },
      { status: 400 },
    );
  }

  try {
    let text: string;

    if (group === 'noaa') {
      // NOAA satellites aren't in a CelesTrak GROUP — fetch by catalog number
      const results = await Promise.all(
        NOAA_CATNRS.map(async (catnr) => {
          const res = await fetch(
            `${CELESTRAK_BASE_URL}?CATNR=${catnr}&FORMAT=tle`,
            { next: { revalidate: 3600 } },
          );
          if (!res.ok) return '';
          return res.text();
        }),
      );
      text = results.filter(Boolean).join('\n');
    } else {
      const url = `${CELESTRAK_BASE_URL}?GROUP=${group}&FORMAT=tle`;
      const response = await fetch(url, { next: { revalidate: 3600 } });

      if (!response.ok) {
        return NextResponse.json(
          { error: `CelesTrak returned ${response.status}` },
          { status: 502 },
        );
      }

      text = await response.text();
    }

    return new NextResponse(text, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch TLE data' }, { status: 500 });
  }
}
