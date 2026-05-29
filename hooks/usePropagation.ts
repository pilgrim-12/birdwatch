'use client';

import { useEffect, useRef } from 'react';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { propagateAll } from '@/lib/sgp4';
import { propagateChunked } from '@/lib/propagateChunked';
import type { TLEData } from '@/types/satellite';

/**
 * Runs SGP4 propagation loops for all satellites and writes positions
 * to the Zustand store. Extracted from GlobeView so that positions
 * update regardless of which view (globe / flat map) is active.
 */
export function usePropagation() {
  const satellites = useSatelliteStore((s) => s.satellites);
  const massSatellites = useSatelliteStore((s) => s.massSatellites);
  const updatePositions = useSatelliteStore((s) => s.updatePositions);
  const updateMassPositions = useSatelliteStore((s) => s.updateMassPositions);

  // Cache TLE refs to avoid recreating arrays every tick
  const satTleRef = useRef<{ tle: TLEData; id: number }[]>([]);
  useEffect(() => {
    satTleRef.current = satellites.map((s) => ({ tle: s.tle, id: s.id }));
  }, [satellites]);

  const massTleRef = useRef<{ tle: TLEData; id: number }[]>([]);
  useEffect(() => {
    massTleRef.current = massSatellites.map((s) => ({ tle: s.tle, id: s.id }));
  }, [massSatellites]);

  // Normal satellite propagation — every 250ms
  useEffect(() => {
    if (satellites.length === 0) return;
    const tick = () => {
      const now = new Date();
      const newPositions = propagateAll(satTleRef.current, now);
      updatePositions(newPositions);
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [satellites, updatePositions]);

  // Mass satellite propagation — every 2s, chunked to avoid blocking UI
  useEffect(() => {
    if (massSatellites.length === 0) return;
    let cancelChunk: (() => void) | null = null;
    const tick = () => {
      const now = new Date();
      cancelChunk = propagateChunked(massTleRef.current, now, (newPositions) => {
        updateMassPositions(newPositions);
      });
    };
    tick();
    const interval = setInterval(tick, 2000);
    return () => {
      clearInterval(interval);
      cancelChunk?.();
    };
  }, [massSatellites, updateMassPositions]);
}
