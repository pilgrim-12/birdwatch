'use client';

import { useEffect, useRef, useState } from 'react';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { ALLOWED_GROUPS } from '@/lib/constants';
import type { SatelliteGroup } from '@/lib/constants';
import type { Satellite } from '@/types/satellite';

const MAX_SHARED_SATS = 20;

function parseIds(raw: string | null): number[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, MAX_SHARED_SATS);
}

/** Build the shareable query string for the current view */
export function buildShareQuery(): string {
  const s = useSatelliteStore.getState();
  const params = new URLSearchParams();

  if (s.selectedSatIds.length > 0) {
    params.set('sat', s.selectedSatIds.slice(0, MAX_SHARED_SATS).join(','));
  }
  if (s.activeGroups.length > 0) params.set('groups', s.activeGroups.join(','));
  if (s.observer) {
    const { lat, lng, alt } = s.observer;
    params.set('obs', `${lat.toFixed(4)},${lng.toFixed(4)}${alt ? `,${Math.round(alt)}` : ''}`);
    if (s.observerLabel) params.set('place', s.observerLabel);
  }
  if (s.mapMode === 'flat') params.set('map', 'flat');
  if (!s.nightMode) params.set('day', '1');
  if (s.isTimelineOpen && Math.round(s.timeOffsetSec) !== 0) {
    params.set('t', String(Math.round(s.timeOffsetSec)));
  }

  return params.toString();
}

/**
 * Two-way sync between the view and the URL: a shared link restores the
 * satellites, groups, observer, map mode and time offset it was made with.
 *
 * Returns `hydrated` — false until the URL has been read. Data fetching keyed on
 * store state must wait for it, otherwise it fires once against the persisted
 * state and again against the link's, and the first round is wasted.
 */
export function useUrlState(): { hydrated: boolean } {
  const [hydrated, setHydrated] = useState(false);
  const pendingSatsRef = useRef<number[]>([]);
  const resolveTriedRef = useRef(false);

  const satellites = useSatelliteStore((s) => s.satellites);
  const massSatellites = useSatelliteStore((s) => s.massSatellites);
  const selectedSatIds = useSatelliteStore((s) => s.selectedSatIds);
  const activeGroups = useSatelliteStore((s) => s.activeGroups);
  const observer = useSatelliteStore((s) => s.observer);
  const observerLabel = useSatelliteStore((s) => s.observerLabel);
  const mapMode = useSatelliteStore((s) => s.mapMode);
  const nightMode = useSatelliteStore((s) => s.nightMode);
  const isTimelineOpen = useSatelliteStore((s) => s.isTimelineOpen);
  const timeOffsetSec = useSatelliteStore((s) => s.timeOffsetSec);

  // --- Read the URL once on mount ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const store = useSatelliteStore.getState();

    const groups = params.get('groups');
    if (groups) {
      const valid = groups
        .split(',')
        .filter((g): g is SatelliteGroup => (ALLOWED_GROUPS as readonly string[]).includes(g));
      // Only touch the store when the link actually differs from what is already
      // active: a new array identity restarts the TLE fetch and throws away the
      // batch that is already in flight, leaving the globe empty in the meantime.
      const current = store.activeGroups;
      const same =
        valid.length === current.length && valid.every((g) => current.includes(g));
      if (valid.length > 0 && !same) store.setActiveGroups(valid);
    }

    const obs = params.get('obs');
    if (obs) {
      const [lat, lng, alt] = obs.split(',').map(Number);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        store.setObserver({ lat, lng, alt: Number.isFinite(alt) ? alt : 0 }, params.get('place'));
      }
    }

    if (params.get('map') === 'flat') store.setMapMode('flat');
    if (params.get('day') === '1' && store.nightMode) store.toggleNightMode();

    const offset = parseInt(params.get('t') ?? '', 10);
    if (Number.isFinite(offset) && offset !== 0) {
      store.setTimelineOpen(true);
      store.setTimeOffsetSec(offset);
    }

    pendingSatsRef.current = parseIds(params.get('sat'));
    setHydrated(true);
  }, []);

  // --- Select the shared satellites once their groups have loaded ---
  useEffect(() => {
    if (!hydrated || pendingSatsRef.current.length === 0) return;
    if (satellites.length === 0 && massSatellites.length === 0) return;

    const known = new Set<number>();
    for (const s of satellites) known.add(s.id);
    for (const s of massSatellites) known.add(s.id);

    const found = pendingSatsRef.current.filter((id) => known.has(id));
    const missing = pendingSatsRef.current.filter((id) => !known.has(id));

    if (found.length > 0) {
      useSatelliteStore.getState().selectSatellites(found);
      pendingSatsRef.current = missing;
    }

    // Anything not in the loaded groups: pull its TLE from CelesTrak by NORAD id
    if (missing.length > 0 && !resolveTriedRef.current) {
      resolveTriedRef.current = true;
      (async () => {
        const resolved: Satellite[] = [];
        for (const id of missing) {
          try {
            const res = await fetch(`/api/search?catnr=${id}`);
            if (!res.ok) continue;
            const data = await res.json();
            const match = data.find((r: { id: number }) => r.id === id);
            if (match) {
              resolved.push({ id: match.id, name: match.name, tle: match.tle, group: 'search', position: null });
            }
          } catch {
            /* ignore */
          }
        }
        if (resolved.length > 0) {
          const store = useSatelliteStore.getState();
          store.setSatellites([...store.satellites, ...resolved]);
          store.selectSatellites(resolved.map((s) => s.id));
        }
        pendingSatsRef.current = [];
      })();
    }
  }, [hydrated, satellites, massSatellites]);

  // --- Write the URL back, debounced ---
  useEffect(() => {
    if (!hydrated) return;
    const id = setTimeout(() => {
      const query = buildShareQuery();
      const next = `${window.location.pathname}${query ? `?${query}` : ''}`;
      if (next !== `${window.location.pathname}${window.location.search}`) {
        window.history.replaceState(null, '', next);
      }
    }, 400);
    return () => clearTimeout(id);
  }, [
    hydrated,
    selectedSatIds,
    activeGroups,
    observer,
    observerLabel,
    mapMode,
    nightMode,
    isTimelineOpen,
    timeOffsetSec,
  ]);

  return { hydrated };
}
