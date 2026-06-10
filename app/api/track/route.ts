import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface IpApiResponse {
  status: string;
  country?: string;
  city?: string;
  lat?: number;
  lon?: number;
}

const SESSION_GAP_MS = 30 * 60 * 1000; // 30 min — same IP after this = new session

// Simple in-memory geo cache — avoids duplicate ip-api.com lookups for same IP
// ip-api.com free tier: 45 req/min — cache prevents hitting that during traffic spikes
const geoCache = new Map<string, { country: string | null; city: string | null; lat: number | null; lng: number | null; ts: number }>();
const GEO_CACHE_TTL = 60 * 60 * 1000; // 1 hour

/** POST /api/track — create or resume a session (also handles beacon PATCH) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // sendBeacon always sends POST — handle PATCH via _method field
    if (body._method === 'PATCH') {
      const { id, duration } = body;
      if (!id) return NextResponse.json({ ok: false }, { status: 400 });
      await supabaseAdmin
        .from('visitors')
        .update({ duration, last_seen: new Date().toISOString() })
        .eq('id', id);
      return NextResponse.json({ ok: true });
    }
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      body.ip ||
      'unknown';
    const userAgent = body.userAgent || req.headers.get('user-agent') || null;
    const path = body.path || '/';
    const referer = body.referer || null;

    // Check for existing recent session from same IP
    const cutoff = new Date(Date.now() - SESSION_GAP_MS).toISOString();
    const { data: existing } = await supabaseAdmin
      .from('visitors')
      .select('id, visit_count')
      .eq('ip', ip)
      .gte('last_seen', cutoff)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      // Resume session — bump visit count and last_seen
      await supabaseAdmin
        .from('visitors')
        .update({
          last_seen: new Date().toISOString(),
          visit_count: (existing.visit_count || 1) + 1,
          path,
        })
        .eq('id', existing.id);

      return NextResponse.json({ id: existing.id, resumed: true });
    }

    // New session — geolocate IP (with in-memory cache to reduce ip-api.com calls)
    let country: string | null = null;
    let city: string | null = null;
    let lat: number | null = null;
    let lng: number | null = null;

    if (ip !== 'unknown' && ip !== '127.0.0.1' && ip !== '::1') {
      const cached = geoCache.get(ip);
      if (cached && Date.now() - cached.ts < GEO_CACHE_TTL) {
        country = cached.country;
        city = cached.city;
        lat = cached.lat;
        lng = cached.lng;
      } else {
        try {
          const geoRes = await fetch(
            `http://ip-api.com/json/${ip}?fields=status,country,city,lat,lon`,
          );
          if (geoRes.ok) {
            const geo: IpApiResponse = await geoRes.json();
            if (geo.status === 'success') {
              country = geo.country ?? null;
              city = geo.city ?? null;
              lat = geo.lat ?? null;
              lng = geo.lon ?? null;
            }
            geoCache.set(ip, { country, city, lat, lng, ts: Date.now() });
            // Evict old entries to prevent memory leak
            if (geoCache.size > 5000) {
              const oldest = geoCache.keys().next().value as string;
              geoCache.delete(oldest);
            }
          }
        } catch {
          // Geolocation failed
        }
      }
    }

    const { data: inserted } = await supabaseAdmin
      .from('visitors')
      .insert({
        ip,
        country,
        city,
        lat,
        lng,
        user_agent: userAgent,
        path,
        referer,
        last_seen: new Date().toISOString(),
        duration: 0,
        visit_count: 1,
      })
      .select('id')
      .single();

    return NextResponse.json({ id: inserted?.id, resumed: false });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

/** PATCH /api/track — heartbeat: update duration and last_seen */
export async function PATCH(req: NextRequest) {
  try {
    const { id, duration } = await req.json();
    if (!id) return NextResponse.json({ ok: false }, { status: 400 });

    await supabaseAdmin
      .from('visitors')
      .update({
        duration,
        last_seen: new Date().toISOString(),
      })
      .eq('id', id);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
