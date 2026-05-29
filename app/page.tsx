'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import GlobeView from '@/components/GlobeView';
import SatelliteList from '@/components/SatelliteList';
import OrbitView from '@/components/OrbitView';
import AntennaGuide from '@/components/AntennaGuide';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { parseTLEText, tlesToSatellites, extractNoradId } from '@/lib/tle';
import { MASS_GROUPS } from '@/lib/constants';
import type { SatelliteGroup } from '@/lib/constants';
import type { Satellite } from '@/types/satellite';
import type { SatNogsInfo, SatNogsTransmitter } from '@/types/satnogs';
import { usePropagation } from '@/hooks/usePropagation';

const FlatMapView = dynamic(() => import('@/components/FlatMapView'), { ssr: false });

export default function Home() {
  const setSatellites = useSatelliteStore((s) => s.setSatellites);
  const setMassSatellites = useSatelliteStore((s) => s.setMassSatellites);
  const activeGroups = useSatelliteStore((s) => s.activeGroups);
  const setSatnogsInfo = useSatelliteStore((s) => s.setSatnogsInfo);
  const setSatnogsTransmitters = useSatelliteStore((s) => s.setSatnogsTransmitters);
  const satnogsLoaded = useSatelliteStore((s) => s.satnogsLoaded);
  const sourceCelestrak = useSatelliteStore((s) => s.sourceCelestrak);
  const sourceSatnogs = useSatelliteStore((s) => s.sourceSatnogs);
  const mapMode = useSatelliteStore((s) => s.mapMode);

  // Run SGP4 propagation (shared between globe and flat map views)
  usePropagation();

  // Fetch CelesTrak TLE data
  useEffect(() => {
    if (!sourceCelestrak) {
      setSatellites([]);
      setMassSatellites([]);
      return;
    }

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
  }, [activeGroups, sourceCelestrak, setSatellites, setMassSatellites]);

  // Fetch SatNOGS enrichment data (non-blocking)
  useEffect(() => {
    if (!sourceSatnogs) {
      // Clear SatNOGS data when disabled
      setSatnogsInfo(new Map());
      setSatnogsTransmitters(new Map());
      return;
    }
    if (satnogsLoaded) return;

    async function fetchSatNOGS() {
      try {
        const [satRes, txRes] = await Promise.all([
          fetch('/api/satnogs/satellites'),
          fetch('/api/satnogs/transmitters'),
        ]);

        if (satRes.ok) {
          const satData: Record<string, SatNogsInfo> = await satRes.json();
          const infoMap = new Map<number, SatNogsInfo>();
          for (const [id, info] of Object.entries(satData)) {
            infoMap.set(Number(id), info);
          }
          setSatnogsInfo(infoMap);
        }

        if (txRes.ok) {
          const txData: Record<string, SatNogsTransmitter[]> = await txRes.json();
          const txMap = new Map<number, SatNogsTransmitter[]>();
          for (const [id, transmitters] of Object.entries(txData)) {
            txMap.set(Number(id), transmitters);
          }
          setSatnogsTransmitters(txMap);
        }
      } catch {
        // SatNOGS unavailable — app works fine without it
      }
    }

    fetchSatNOGS();
  }, [sourceSatnogs, satnogsLoaded, setSatnogsInfo, setSatnogsTransmitters]);

  const isMobilePanelOpen = useSatelliteStore((s) => s.isMobilePanelOpen);
  const setMobilePanelOpen = useSatelliteStore((s) => s.setMobilePanelOpen);
  const setMobileTab = useSatelliteStore((s) => s.setMobileTab);

  return (
    <>
      <Header />
      <main className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative min-w-0">
          {mapMode === 'globe' ? <GlobeView /> : <FlatMapView />}
          {/* Mobile bottom FAB bar */}
          <div className="md:hidden absolute bottom-3 left-3 right-3 z-20 flex gap-2">
            <button
              onClick={() => { setMobileTab('passes'); setMobilePanelOpen(true); }}
              className="flex-1 bg-gray-900/90 backdrop-blur-sm active:bg-gray-800 text-white py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm font-medium border border-gray-700/50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-orange-400">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
              </svg>
              Passes
            </button>
            <button
              onClick={() => { setMobileTab('satellites'); setMobilePanelOpen(true); }}
              className="flex-1 bg-gray-900/90 backdrop-blur-sm active:bg-gray-800 text-white py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm font-medium border border-gray-700/50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-cyan-400">
                <path fillRule="evenodd" d="M2 3.75A.75.75 0 0 1 2.75 3h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 3.75Zm0 4.167a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Zm0 4.166a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
              </svg>
              Satellites
            </button>
          </div>
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
      <AntennaGuide />
    </>
  );
}
