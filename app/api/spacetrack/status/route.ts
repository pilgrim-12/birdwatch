import { NextResponse } from 'next/server';
import { isSpaceTrackConfigured } from '@/lib/spacetrack';

export const dynamic = 'force-dynamic';

// Whether credentials exist changes only on redeploy, and every page load asks.
// Five minutes at the edge keeps that off the function without hiding a change
// for long.
const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' };

/**
 * Whether the server holds Space-Track credentials. Only the yes/no is
 * exposed — never the identity itself — so the UI can say plainly that the
 * source is inert instead of offering a toggle that quietly does nothing.
 */
export async function GET() {
  return NextResponse.json({ configured: isSpaceTrackConfigured() }, { headers: CACHE_HEADERS });
}
