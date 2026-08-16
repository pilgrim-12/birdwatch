import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 86400;

interface OpenMeteoPlace {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  country?: string;
  admin1?: string;
  country_code?: string;
}

/** City/place lookup for the observer location (Open-Meteo geocoding, no API key). */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`,
      { next: { revalidate: 86400 } },
    );
    if (!res.ok) return NextResponse.json([]);

    const data: { results?: OpenMeteoPlace[] } = await res.json();
    const results = (data.results ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      region: [p.admin1, p.country].filter(Boolean).join(', '),
      countryCode: p.country_code?.toLowerCase() ?? null,
      lat: p.latitude,
      lng: p.longitude,
      alt: Math.max(0, Math.round(p.elevation ?? 0)),
    }));

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
