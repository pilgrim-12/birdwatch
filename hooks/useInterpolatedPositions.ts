'use client';

import { useEffect, useRef } from 'react';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import type { SatellitePosition } from '@/types/satellite';

function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return a + d * t;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

interface InterpState {
  prev: Map<number, SatellitePosition>;
  curr: Map<number, SatellitePosition>;
  updateTime: number;
  intervalMs: number;
  lastRef: Map<number, SatellitePosition>;
}

function interpolate(st: InterpState): Map<number, SatellitePosition> {
  const now = performance.now();
  const t = Math.min((now - st.updateTime) / st.intervalMs, 1);

  if (st.prev.size === 0 || t >= 0.99) return st.curr;

  const result = new Map<number, SatellitePosition>();
  st.curr.forEach((cPos, id) => {
    const pPos = st.prev.get(id);
    if (!pPos) {
      result.set(id, cPos);
      return;
    }
    result.set(id, {
      lat: lerp(pPos.lat, cPos.lat, t),
      lng: lerpAngle(pPos.lng, cPos.lng, t),
      alt: lerp(pPos.alt, cPos.alt, t),
      velocity: lerp(pPos.velocity, cPos.velocity, t),
    });
  });
  return result;
}

/**
 * Returns a getter function that computes interpolated positions
 * at the moment of calling. Zero re-renders — call inside RAF loops.
 */
export function useInterpolatedPositions() {
  const stRef = useRef<InterpState>({
    prev: new Map(),
    curr: new Map(),
    updateTime: performance.now(),
    intervalMs: 250,
    lastRef: new Map(),
  });

  useEffect(() => {
    return useSatelliteStore.subscribe((state) => {
      const positions = state.positions;
      if (positions === stRef.current.curr) return;
      stRef.current.prev = stRef.current.curr;
      stRef.current.curr = positions;
      stRef.current.updateTime = performance.now();
    });
  }, []);

  return () => interpolate(stRef.current);
}

export function useInterpolatedMassPositions() {
  const stRef = useRef<InterpState>({
    prev: new Map(),
    curr: new Map(),
    updateTime: performance.now(),
    intervalMs: 2000,
    lastRef: new Map(),
  });

  useEffect(() => {
    return useSatelliteStore.subscribe((state) => {
      const positions = state.massPositions;
      if (positions === stRef.current.curr) return;
      stRef.current.prev = stRef.current.curr;
      stRef.current.curr = positions;
      stRef.current.updateTime = performance.now();
    });
  }, []);

  return () => interpolate(stRef.current);
}
