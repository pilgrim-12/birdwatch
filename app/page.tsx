'use client';

import { useEffect } from 'react';
import Header from '@/components/Header';
import GlobeView from '@/components/GlobeView';
import SatelliteList from '@/components/SatelliteList';
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
