import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface IpApiResponse {
  status: string;
  country?: string;
  city?: string;
  lat?: number;
  lon?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ip = body.ip || 'unknown';
    const userAgent = body.userAgent || null;
    const path = body.path || '/';
    const referer = body.referer || null;

    // Geolocate IP
    let country: string | null = null;
    let city: string | null = null;
    let lat: number | null = null;
    let lng: number | null = null;

    if (ip !== 'unknown' && ip !== '127.0.0.1' && ip !== '::1') {
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city,lat,lon`);
        if (geoRes.ok) {
          const geo: IpApiResponse = await geoRes.json();
          if (geo.status === 'success') {
            country = geo.country ?? null;
            city = geo.city ?? null;
            lat = geo.lat ?? null;
            lng = geo.lon ?? null;
          }
        }
      } catch {
        // Geolocation failed — store without location
      }
    }

    await supabaseAdmin.from('visitors').insert({
      ip,
      country,
      city,
      lat,
      lng,
      user_agent: userAgent,
      path,
      referer,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
