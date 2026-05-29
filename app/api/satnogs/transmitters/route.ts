import { NextResponse } from 'next/server';

export const revalidate = 21600; // 6 hour cache

interface TransmitterRaw {
  uuid: string;
  description: string;
  alive: boolean;
  type: string;
  uplink_low: number | null;
  uplink_high: number | null;
  downlink_low: number | null;
  downlink_high: number | null;
  mode: string | null;
  baud: number | null;
  status: string;
  service: string;
  norad_cat_id: number;
}

export async function GET() {
  try {
    // Fetch only alive transmitters to reduce payload
    const allTx: TransmitterRaw[] = [];
    let url: string | null = 'https://db.satnogs.org/api/transmitters/?format=json&alive=true&page_size=100';

    while (url) {
      const res: Response = await fetch(url, { next: { revalidate: 21600 } });
      if (!res.ok) break;
      const data: TransmitterRaw[] | { results: TransmitterRaw[]; next: string | null } = await res.json();

      if (Array.isArray(data)) {
        allTx.push(...data);
        url = null;
      } else if (data.results) {
        allTx.push(...data.results);
        url = data.next || null;
      } else {
        break;
      }
    }

    // Group by NORAD catalog ID
    const byNorad: Record<number, Array<{
      description: string;
      downlink_low: number | null;
      downlink_high: number | null;
      uplink_low: number | null;
      uplink_high: number | null;
      mode: string | null;
      baud: number | null;
      type: string;
      service: string;
    }>> = {};

    for (const tx of allTx) {
      if (!tx.norad_cat_id || tx.norad_cat_id <= 0) continue;
      if (!byNorad[tx.norad_cat_id]) byNorad[tx.norad_cat_id] = [];
      byNorad[tx.norad_cat_id].push({
        description: tx.description || '',
        downlink_low: tx.downlink_low,
        downlink_high: tx.downlink_high,
        uplink_low: tx.uplink_low,
        uplink_high: tx.uplink_high,
        mode: tx.mode || null,
        baud: tx.baud,
        type: tx.type || '',
        service: tx.service || '',
      });
    }

    return NextResponse.json(byNorad, {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=3600' },
    });
  } catch {
    return NextResponse.json({}, { status: 500 });
  }
}
