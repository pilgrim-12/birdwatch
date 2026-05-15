'use client';

import { useEffect } from 'react';
import Header from '@/components/Header';
import GlobeView from '@/components/GlobeView';
import SatelliteList from '@/components/SatelliteList';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { parseTLEText, tlesToSatellites } from '@/lib/tle';

export default function Home() {
  const setSatellites = useSatelliteStore((s) => s.setSatellites);

  useEffect(() => {
    async function fetchTLE() {
      try {
        const res = await fetch('/api/tle/stations');
        if (!res.ok) return;
        const text = await res.text();
        const tles = parseTLEText(text);
        const sats = tlesToSatellites(tles);
        setSatellites(sats);
      } catch {
        // Network error — satellites will remain empty
      }
    }

    fetchTLE();
  }, [setSatellites]);

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
