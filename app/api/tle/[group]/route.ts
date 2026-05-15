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
    const url = `${CELESTRAK_BASE_URL}?GROUP=${group}&FORMAT=tle`;
    const response = await fetch(url, { next: { revalidate: 3600 } });

    if (!response.ok) {
      return NextResponse.json(
        { error: `CelesTrak returned ${response.status}` },
        { status: 502 },
      );
    }

    const text = await response.text();
    return new NextResponse(text, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch TLE data' }, { status: 500 });
  }
}
