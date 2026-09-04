'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import GlobeView from '@/components/GlobeView';
import SatelliteList from '@/components/SatelliteList';
import OrbitView from '@/components/OrbitView';
import AntennaGuide from '@/components/AntennaGuide';
import SelectedPanel from '@/components/SelectedPanel';
import TimelineBar from '@/components/TimelineBar';
import ObserverPicker from '@/components/ObserverPicker';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { parseTLEText, tlesToSatellites, extractNoradId } from '@/lib/tle';
import { MASS_GROUPS } from '@/lib/constants';
import type { SatelliteGroup } from '@/lib/constants';
import type { Satellite } from '@/types/satellite';
import type { SatNogsInfo, SatNogsTransmitter } from '@/types/satnogs';
import type { GroundStation } from '@/types/groundStation';
import { PROFESSIONAL_STATIONS } from '@/lib/groundStations';
import { usePropagation } from '@/hooks/usePropagation';
import { useUrlState } from '@/hooks/useUrlState';
import { useToastStore } from '@/store/useToastStore';
import VisitorTracker from '@/components/VisitorTracker';

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
  const sourceSpacetrack = useSatelliteStore((s) => s.sourceSpacetrack);
  const mapMode = useSatelliteStore((s) => s.mapMode);
  const showGroundStations = useSatelliteStore((s) => s.showGroundStations);
  const setGroundStations = useSatelliteStore((s) => s.setGroundStations);

  const addToast = useToastStore((s) => s.addToast);

  // Run SGP4 propagation (shared between globe and flat map views)
  usePropagation();

  // Restore/reflect the view in the URL so it can be shared
  const { hydrated } = useUrlState();

  // Fetch CelesTrak TLE data
  useEffect(() => {
    // Wait for the URL to be applied — otherwise a shared link fetches the
    // persisted groups first and the link's groups immediately after.
    if (!hydrated) return;

    if (!sourceCelestrak) {
      // Still load collection satellites even with CelesTrak disabled
      const { collectionSatIds, collectionTLEs } = useSatelliteStore.getState();
      const collectionSats: Satellite[] = collectionSatIds
        .map((cid) => {
          const data = collectionTLEs[cid];
          if (!data) return null;
          return { id: cid, name: data.name, tle: data.tle, group: 'collection' as string, position: null } as Satellite;
        })
        .filter((s): s is Satellite => s !== null);
      setSatellites(collectionSats);
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

    /**
     * One group's TLEs, retried once. `tles: null` means the group could not be
     * loaded — CelesTrak rate-limits bursts and our route turns that into a 502,
     * and an empty list there is indistinguishable from "this group is empty".
     */
    async function fetchGroup(group: string) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch(`/api/tle/${group}${sourceSpacetrack ? '?st=1' : ''}`);
          if (res.ok) return { group, tles: parseTLEText(await res.text()) };
        } catch {
          /* network hiccup — fall through to the retry */
        }
        if (cancelled) break;
        if (attempt === 0) await new Promise((r) => setTimeout(r, 700));
      }
      return { group, tles: null };
    }

    async function fetchAllGroups() {
      try {
        // Fetch normal groups
        const settled = await Promise.all(normalGroups.map(fetchGroup));

        if (cancelled) return;

        const failed = settled.filter((r) => r.tles === null).map((r) => r.group);
        // Every group failed: keep whatever is already on screen instead of
        // blanking the globe with no explanation.
        if (failed.length > 0 && failed.length === normalGroups.length) {
          addToast('CelesTrak is not responding — satellite data could not be refreshed');
          return;
        }
        if (failed.length > 0) {
          addToast(`Could not load: ${failed.join(', ')}`);
        }

        const results = settled.filter(
          (r): r is { group: string; tles: ReturnType<typeof parseTLEText> } => r.tles !== null,
        );

        // Merge normal satellites, deduplicate by NORAD ID
        const seen = new Set<number>();
        const allSats: Satellite[] = [];
        for (const { group, tles } of results) {
          for (const tle of tles) {
            const id = extractNoradId(tle.line2);
            // A malformed catalog number yields NaN, and a Set treats every NaN
            // as the same key — keeping them would collapse the lot into one.
            if (!Number.isFinite(id) || seen.has(id)) continue;
            seen.add(id);
            allSats.push(...tlesToSatellites([tle], group));
          }
        }

        // Inject collection satellites (not already in a group)
        const { collectionSatIds, collectionTLEs } = useSatelliteStore.getState();
        for (const cid of collectionSatIds) {
          if (seen.has(cid)) continue;
          const data = collectionTLEs[cid];
          if (!data) continue;
          seen.add(cid);
          allSats.push({ id: cid, name: data.name, tle: data.tle, group: 'collection', position: null });
        }

        setSatellites(allSats);

        // Fetch mass groups separately (e.g., Starlink)
        if (massGroups.length > 0) {
          const massSettled = await Promise.all(massGroups.map(fetchGroup));

          if (cancelled) return;

          const massFailed = massSettled.filter((r) => r.tles === null).map((r) => r.group);
          if (massFailed.length > 0) {
            addToast(`Could not load: ${massFailed.join(', ')}`);
          }
          if (massFailed.length === massGroups.length) return;

          const massResults = massSettled.filter(
            (r): r is { group: string; tles: ReturnType<typeof parseTLEText> } => r.tles !== null,
          );

          const massSats: Satellite[] = [];
          for (const { group, tles } of massResults) {
            for (const tle of tles) {
              const id = extractNoradId(tle.line2);
              if (!Number.isFinite(id) || seen.has(id)) continue;
              seen.add(id);
              massSats.push(...tlesToSatellites([tle], group));
            }
          }

          setMassSatellites(massSats);
        } else {
          setMassSatellites([]);
        }
      } catch {
        useToastStore.getState().addToast('Failed to load satellite data from CelesTrak');
      }
    }

    fetchAllGroups();
    return () => {
      cancelled = true;
    };
  }, [hydrated, activeGroups, sourceCelestrak, sourceSpacetrack, setSatellites, setMassSatellites, addToast]);

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
        useToastStore.getState().addToast('SatNOGS data unavailable');
      }
    }

    fetchSatNOGS();
  }, [sourceSatnogs, satnogsLoaded, setSatnogsInfo, setSatnogsTransmitters]);

  // Fetch ground stations (lazy — only when toggle is on)
  useEffect(() => {
    if (!showGroundStations) {
      setGroundStations([]);
      return;
    }

    let cancelled = false;

    async function fetchStations() {
      try {
        const res = await fetch('/api/stations');
        if (!res.ok) throw new Error('Failed to fetch stations');
        const satnogs: GroundStation[] = await res.json();
        if (cancelled) return;
        setGroundStations([...PROFESSIONAL_STATIONS, ...satnogs]);
      } catch {
        if (!cancelled) {
          setGroundStations([...PROFESSIONAL_STATIONS]);
          useToastStore.getState().addToast('SatNOGS ground stations unavailable, showing professional stations only');
        }
      }
    }

    fetchStations();
    return () => { cancelled = true; };
  }, [showGroundStations, setGroundStations]);

  const isMobilePanelOpen = useSatelliteStore((s) => s.isMobilePanelOpen);
  const setMobilePanelOpen = useSatelliteStore((s) => s.setMobilePanelOpen);
  const setMobileTab = useSatelliteStore((s) => s.setMobileTab);

  return (
    <>
      <Header />
      <main className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative min-w-0">
          {mapMode === 'globe' ? <GlobeView /> : <FlatMapView />}
          <SelectedPanel />
          <TimelineBar />
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
      <ObserverPicker />
      <VisitorTracker />
    </>
  );
}
