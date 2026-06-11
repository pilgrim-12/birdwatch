import { NextResponse } from 'next/server';
import type { GroundStation } from '@/types/groundStation';

export const revalidate = 21600; // 6 hour cache

interface SatnogsStation {
  id: number;
  name: string;
  lat: number;
  lng: number;
  altitude: number;
  status: string;
  owner: string;
  antenna: { band: string; antenna_type_name: string }[];
  observations: number;
  image: string;
}

export async function GET() {
  try {
    // Fetch online stations from SatNOGS Network API
    const res = await fetch(
      'https://network.satnogs.org/api/stations/?format=json&status=2',
      { next: { revalidate: 21600 } },
    );

    if (!res.ok) {
      return NextResponse.json([], { status: 502 });
    }

    const raw: SatnogsStation[] = await res.json();

    const stations: GroundStation[] = raw.map((s) => ({
      id: s.id,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      alt: s.altitude || 0,
      network: 'satnogs' as const,
      status: 'online' as const,
      owner: s.owner || undefined,
      antennas: s.antenna?.map((a) => `${a.antenna_type_name} (${a.band})`) || undefined,
      observations: s.observations || 0,
      image: s.image || undefined,
    }));

    return NextResponse.json(stations, {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=3600' },
    });
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
