'use client';

import { useEffect } from 'react';
import Header from '@/components/Header';
import GlobeView from '@/components/GlobeView';
import SatelliteList from '@/components/SatelliteList';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { parseTLEText, tlesToSatellites } from '@/lib/tle';

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
            if (!res.ok) return [];
            const text = await res.text();
            return parseTLEText(text);
          }),
        );

        if (cancelled) return;

        // Merge all TLEs, deduplicate by NORAD ID
        const allTles = results.flat();
        const seen = new Set<string>();
        const unique = allTles.filter((tle) => {
          const id = tle.line2.substring(2, 7).trim();
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });

        const sats = tlesToSatellites(unique);
        setSatellites(sats);
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
