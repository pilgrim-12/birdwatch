import { NextRequest, NextResponse } from 'next/server';
import { CELESTRAK_BASE_URL, ALLOWED_GROUPS, type SatelliteGroup } from '@/lib/constants';

export const revalidate = 3600; // 1 hour cache


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
      // NOAA satellites aren't in a CelesTrak GROUP — fetch by name search
      const response = await fetch(
        `${CELESTRAK_BASE_URL}?NAME=NOAA&FORMAT=tle`,
        { next: { revalidate: 3600 } },
      );
      if (!response.ok) {
        return NextResponse.json(
          { error: `CelesTrak returned ${response.status}` },
          { status: 502 },
        );
      }
      const raw = await response.text();
      // Filter: keep only operational NOAA satellites (15, 18, 19, 20, 21)
      // NOAA 1-14, 16, 17 are decommissioned/dead
      const operationalNoaa = new Set([
        'NOAA 15', 'NOAA 18', 'NOAA 19',
        'NOAA 20 (JPSS-1)', 'NOAA 21 (JPSS-2)',
      ]);
      const lines = raw.split('\n');
      const filtered: string[] = [];
      for (let i = 0; i < lines.length - 2; i += 3) {
        const name = lines[i].trim();
        if (name && operationalNoaa.has(name)) {
          filtered.push(lines[i], lines[i + 1], lines[i + 2]);
        }
      }
      text = filtered.join('\n');
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
