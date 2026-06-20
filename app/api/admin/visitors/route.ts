import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function checkAdminKey(header: string | null): boolean {
  const expected = process.env.ADMIN_KEY;
  if (!header || !expected) return false;
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export async function GET(req: NextRequest) {
  if (!checkAdminKey(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch last 500 visitors
  const { data: visitors, error } = await supabaseAdmin
    .from('visitors')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Compute stats
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { count: todayCount } = await supabaseAdmin
    .from('visitors')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayStart);

  const { count: weekCount } = await supabaseAdmin
    .from('visitors')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekStart);

  const { count: totalCount } = await supabaseAdmin
    .from('visitors')
    .select('*', { count: 'exact', head: true });

  // Unique IPs
  const allVisitors = visitors || [];
  const todayIps = new Set<string>();
  const weekIps = new Set<string>();
  const allIps = new Set<string>();
  for (const v of allVisitors) {
    allIps.add(v.ip);
    if (v.created_at >= todayStart) todayIps.add(v.ip);
    if (v.created_at >= weekStart) weekIps.add(v.ip);
  }

  // Top countries (by unique IP)
  const countryIps = new Map<string, Set<string>>();
  for (const v of allVisitors) {
    const c = v.country || 'Unknown';
    if (!countryIps.has(c)) countryIps.set(c, new Set());
    countryIps.get(c)!.add(v.ip);
  }
  const topCountries = [...countryIps.entries()]
    .map(([country, ips]) => ({ country, count: ips.size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return NextResponse.json({
    visitors: allVisitors,
    stats: {
      today: todayCount || 0,
      thisWeek: weekCount || 0,
      total: totalCount || 0,
      uniqueToday: todayIps.size,
      uniqueWeek: weekIps.size,
      uniqueTotal: allIps.size,
      topCountries,
    },
  });
}
