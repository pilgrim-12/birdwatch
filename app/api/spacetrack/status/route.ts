import { NextResponse } from 'next/server';
import { isSpaceTrackConfigured } from '@/lib/spacetrack';

export const dynamic = 'force-dynamic';

/**
 * Whether the server holds Space-Track credentials. Only the yes/no is
 * exposed — never the identity itself — so the UI can say plainly that the
 * source is inert instead of offering a toggle that quietly does nothing.
 */
export async function GET() {
  return NextResponse.json({ configured: isSpaceTrackConfigured() });
}
