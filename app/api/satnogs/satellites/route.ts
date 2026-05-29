import { NextResponse } from 'next/server';

export const revalidate = 21600; // 6 hour cache

interface SatNogsRaw {
  norad_cat_id: number;
  name: string;
  status: string;
  launched: string | null;
  operator: string;
  countries: string;
  website: string;
  image: string | null;
}

export async function GET() {
  try {
    // SatNOGS paginates — fetch all pages
    const allSats: SatNogsRaw[] = [];
    let url: string | null = 'https://db.satnogs.org/api/satellites/?format=json&page_size=100';

    while (url) {
      const res: Response = await fetch(url, { next: { revalidate: 21600 } });
      if (!res.ok) break;
      const data: SatNogsRaw[] | { results: SatNogsRaw[]; next: string | null } = await res.json();

      if (Array.isArray(data)) {
        allSats.push(...data);
        url = null;
      } else if (data.results) {
        allSats.push(...data.results);
        url = data.next || null;
      } else {
        break;
      }
    }

    // Build map keyed by NORAD catalog ID (skip entries without valid norad_cat_id)
    const byNorad: Record<number, {
      status: string;
      launched: string | null;
      operator: string;
      countries: string;
      website: string;
      image: string | null;
    }> = {};

    for (const sat of allSats) {
      if (!sat.norad_cat_id || sat.norad_cat_id <= 0) continue;
      byNorad[sat.norad_cat_id] = {
        status: sat.status || 'alive',
        launched: sat.launched || null,
        operator: sat.operator || '',
        countries: sat.countries || '',
        website: sat.website || '',
        image: sat.image || null,
      };
    }

    return NextResponse.json(byNorad, {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=3600' },
    });
  } catch {
    return NextResponse.json({}, { status: 500 });
  }
}
