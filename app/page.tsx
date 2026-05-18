'use client';

import { useEffect } from 'react';
import Header from '@/components/Header';
import GlobeView from '@/components/GlobeView';
import SatelliteList from '@/components/SatelliteList';
import OrbitView from '@/components/OrbitView';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { parseTLEText, tlesToSatellites, extractNoradId } from '@/lib/tle';
import { MASS_GROUPS } from '@/lib/constants';
import type { SatelliteGroup } from '@/lib/constants';
import type { Satellite } from '@/types/satellite';

export default function Home() {
  const setSatellites = useSatelliteStore((s) => s.setSatellites);
  const setMassSatellites = useSatelliteStore((s) => s.setMassSatellites);
  const activeGroups = useSatelliteStore((s) => s.activeGroups);

  useEffect(() => {
    let cancelled = false;

    // Separate mass groups (starlink, active) from normal groups
    const normalGroups = activeGroups.filter(
      (g) => !MASS_GROUPS.includes(g as SatelliteGroup),
    );
    const massGroups = activeGroups.filter((g) =>
      MASS_GROUPS.includes(g as SatelliteGroup),
    );

    async function fetchAllGroups() {
      try {
        // Fetch normal groups
        const results = await Promise.all(
          normalGroups.map(async (group) => {
            const res = await fetch(`/api/tle/${group}`);
            if (!res.ok) return { group, tles: [] as ReturnType<typeof parseTLEText> };
            const text = await res.text();
            return { group, tles: parseTLEText(text) };
          }),
        );

        if (cancelled) return;

        // Merge normal satellites, deduplicate by NORAD ID
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

        // Fetch mass groups separately (e.g., Starlink)
        if (massGroups.length > 0) {
          const massResults = await Promise.all(
            massGroups.map(async (group) => {
              const res = await fetch(`/api/tle/${group}`);
              if (!res.ok) return { group, tles: [] as ReturnType<typeof parseTLEText> };
              const text = await res.text();
              return { group, tles: parseTLEText(text) };
            }),
          );

          if (cancelled) return;

          const massSats: Satellite[] = [];
          for (const { group, tles } of massResults) {
            for (const tle of tles) {
              const id = extractNoradId(tle.line2);
              if (seen.has(id)) continue;
              seen.add(id);
              massSats.push(...tlesToSatellites([tle], group));
            }
          }

          setMassSatellites(massSats);
        } else {
          setMassSatellites([]);
        }
      } catch {
        // Network error — satellites will remain empty
      }
    }

    fetchAllGroups();
    return () => {
      cancelled = true;
    };
  }, [activeGroups, setSatellites, setMassSatellites]);

  const isMobilePanelOpen = useSatelliteStore((s) => s.isMobilePanelOpen);
  const toggleMobilePanel = useSatelliteStore((s) => s.toggleMobilePanel);
  const setMobilePanelOpen = useSatelliteStore((s) => s.setMobilePanelOpen);

  return (
    <>
      <Header />
      <main className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          <GlobeView />
          {/* Mobile FAB to open satellite panel */}
          <button
            onClick={toggleMobilePanel}
            className="md:hidden absolute bottom-4 right-4 z-20 bg-cyan-600 active:bg-cyan-700 text-white px-4 py-3 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M2 3.75A.75.75 0 0 1 2.75 3h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 3.75Zm0 4.167a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Zm0 4.166a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Zm0 4.167a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
            </svg>
            Satellites
          </button>
        </div>
        {/* Mobile backdrop */}
        {isMobilePanelOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-20"
            onClick={() => setMobilePanelOpen(false)}
          />
        )}
        <SatelliteList />
      </main>
      <OrbitView />
    </>
  );
}
