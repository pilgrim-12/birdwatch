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
      // Dynamic filter: exclude debris, keep only modern NOAA sats (launched 1998+)
      // Launch year is extracted from TLE line 1 international designator (chars 9-10)
      const lines = raw.split('\n');
      const filtered: string[] = [];
      for (let i = 0; i < lines.length - 2; i += 3) {
        const name = lines[i].trim();
        if (!name || name.includes('DEB') || name.includes('R/B')) continue;
        const line1 = lines[i + 1];
        if (!line1 || !line1.startsWith('1 ')) continue;
        // Extract 2-digit launch year from international designator (col 9-10)
        const yy = parseInt(line1.substring(9, 11), 10);
        const launchYear = yy >= 57 ? 1900 + yy : 2000 + yy;
        if (launchYear >= 1998) {
          filtered.push(lines[i], lines[i + 1], lines[i + 2]);
        }
      }
      text = filtered.join('\n');
    } else {
      // Map internal group names to CelesTrak group names where they differ
      const celestrakGroup = group === 'iridium' ? 'iridium-NEXT' : group;
      const url = `${CELESTRAK_BASE_URL}?GROUP=${celestrakGroup}&FORMAT=tle`;
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
