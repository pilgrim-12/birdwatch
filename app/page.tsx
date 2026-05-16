'use client';

import { useEffect } from 'react';
import Header from '@/components/Header';
import GlobeView from '@/components/GlobeView';
import SatelliteList from '@/components/SatelliteList';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { parseTLEText, tlesToSatellites, extractNoradId } from '@/lib/tle';
import type { Satellite } from '@/types/satellite';

export default function Home() {
  const setSatellites = useSatelliteStore((s) => s.setSatellites);
  const activeGroups = useSatelliteStore((s) => s.activeGroups);

  useEffect(() => {
    let cancelled = false;

    async function fetchAllGroups() {
      try {
        const results = await Promise.all(
          activeGroups.map(async (group) => {
            const res = await fetch(`/api/tle/${group}`);
            if (!res.ok) return { group, tles: [] as ReturnType<typeof parseTLEText> };
            const text = await res.text();
            return { group, tles: parseTLEText(text) };
          }),
        );

        if (cancelled) return;

        // Merge all satellites, deduplicate by NORAD ID (first group wins)
        const seen = new Set<number>();
        const allSats: Satellite[] = [];
        for (const { group, tles } of results) {
          for (const tle of tles) {
            const id = extractNoradId(tle.line2);
            if (seen.has(id)) continue;
            seen.add(id);
            allSats.push(...tlesToSatellites([tle], group));
          }
        }

        setSatellites(allSats);
      } catch {
        // Network error — satellites will remain empty
      }
    }

    fetchAllGroups();
    return () => {
      cancelled = true;
    };
  }, [activeGroups, setSatellites]);

  return (
    <>
      <Header />
      <main className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          <GlobeView />
        </div>
        <SatelliteList />
      </main>
    </>
  );
}
