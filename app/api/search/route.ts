import { NextRequest, NextResponse } from 'next/server';
import { CELESTRAK_BASE_URL } from '@/lib/constants';
import { parseTLEText } from '@/lib/tle';

export const revalidate = 300;

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const response = await fetch(
      `${CELESTRAK_BASE_URL}?NAME=${encodeURIComponent(q)}&FORMAT=tle`,
      { next: { revalidate: 300 } },
    );

    if (!response.ok) {
      return NextResponse.json([]);
    }

    const text = await response.text();
    if (!text.trim()) {
      return NextResponse.json([]);
    }

    const tles = parseTLEText(text);
    const results = tles.slice(0, 30).map((tle) => {
      const noradId = parseInt(tle.line2.substring(2, 7).trim(), 10);
      return { id: noradId, name: tle.name, tle };
    });

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
