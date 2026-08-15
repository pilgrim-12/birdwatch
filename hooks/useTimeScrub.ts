'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { computeGroundTrack } from '@/lib/orbit';
import { propagateSatellite } from '@/lib/sgp4';
import { EARTH_RADIUS_KM, GROUP_COLORS } from '@/lib/constants';
import type { SatelliteGroup } from '@/lib/constants';
import type { Satellite } from '@/types/satellite';
import type { ScrubGhost, ScrubTrack } from '@/types/scrub';

export type { ScrubGhost, ScrubTrack };

/** Ground tracks are expensive to draw — only the most recently selected sats get one */
export const TRACK_LIMIT = 12;
/** Ghost markers are cheap but still DOM/canvas work */
export const GHOST_LIMIT = 60;

/** Track geometry is recomputed on this bucket, not on every scrub tick */
const TRACK_BUCKET_MS = 30_000;

export interface TimeScrubData {
  /** Timeline is open and at least one satellite is selected */
  enabled: boolean;
  /** Ghost markers are meaningful (offset moved away from live) */
  scrubbing: boolean;
  nowMs: number;
  scrubMs: number;
  offsetSec: number;
  ghosts: ScrubGhost[];
  tracks: ScrubTrack[];
  /** Selected satellites that did not get a track because of TRACK_LIMIT */
  tracksOmitted: number;
}

/** Real clock, ticking on whole seconds so every consumer stays in sync */
function useSecondClock(active: boolean): number {
  const [nowMs, setNowMs] = useState(() => Math.floor(Date.now() / 1000) * 1000);

  useEffect(() => {
    if (!active) return;
    let interval: ReturnType<typeof setInterval> | null = null;
    const tick = () => setNowMs(Math.floor(Date.now() / 1000) * 1000);
    tick();
    // Align to the next whole second, then tick once per second
    const timeout = setTimeout(() => {
      tick();
      interval = setInterval(tick, 1000);
    }, 1000 - (Date.now() % 1000));
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [active]);

  return nowMs;
}

/**
 * Time-scrub data for the selected satellites: a two-sided ground track
 * (past / future relative to the real clock) plus "ghost" markers showing
 * where each satellite is at the scrubbed moment.
 */
export function useTimeScrub(options?: { withTracks?: boolean }): TimeScrubData {
  const withTracks = options?.withTracks ?? true;
  const isTimelineOpen = useSatelliteStore((s) => s.isTimelineOpen);
  const timeOffsetSec = useSatelliteStore((s) => s.timeOffsetSec);
  const timeWindowSec = useSatelliteStore((s) => s.timeWindowSec);
  const selectedSatIds = useSatelliteStore((s) => s.selectedSatIds);
  const satellites = useSatelliteStore((s) => s.satellites);
  const massSatellites = useSatelliteStore((s) => s.massSatellites);

  const enabled = isTimelineOpen && selectedSatIds.length > 0;
  // Clock runs whenever the timeline is visible so the readout stays live
  const nowMs = useSecondClock(isTimelineOpen);
  const scrubMs = nowMs + timeOffsetSec * 1000;

  // Selected satellites, most recently selected first
  const selectedSats = useMemo(() => {
    if (!enabled) return [];
    const byId = new Map<number, Satellite>();
    for (const s of satellites) byId.set(s.id, s);
    for (const s of massSatellites) if (!byId.has(s.id)) byId.set(s.id, s);
    const out: Satellite[] = [];
    for (let i = selectedSatIds.length - 1; i >= 0; i--) {
      const sat = byId.get(selectedSatIds[i]);
      if (sat) out.push(sat);
    }
    return out;
  }, [enabled, selectedSatIds, satellites, massSatellites]);

  const trackSats = useMemo(() => selectedSats.slice(0, TRACK_LIMIT), [selectedSats]);
  const ghostSats = useMemo(() => selectedSats.slice(0, GHOST_LIMIT), [selectedSats]);

  // Bucketed so the geometry is not rebuilt on every scrub tick
  const trackBucket = Math.floor(nowMs / TRACK_BUCKET_MS);

  const tracks = useMemo(() => {
    if (!enabled || !withTracks) return [];
    const centerMs = trackBucket * TRACK_BUCKET_MS;
    // ~360 samples per track regardless of window width
    const stepSec = Math.max(15, Math.round(timeWindowSec / 180));
    const out: ScrubTrack[] = [];
    for (const sat of trackSats) {
      const points = computeGroundTrack(sat.tle, centerMs, timeWindowSec, timeWindowSec, stepSec);
      if (points.length === 0) continue;
      const splitAt = points.findIndex((p) => p.t > centerMs);
      const cut = splitAt === -1 ? points.length : splitAt;
      out.push({
        id: sat.id,
        color: GROUP_COLORS[sat.group as SatelliteGroup] || '#00d4ff',
        // Overlap by one sample so the two segments visually join
        past: points.slice(0, Math.min(cut + 1, points.length)),
        future: points.slice(Math.max(cut - 1, 0)),
      });
    }
    return out;
  }, [enabled, withTracks, trackSats, trackBucket, timeWindowSec]);

  const scrubbing = enabled && Math.abs(timeOffsetSec) >= 1;

  const ghosts = useMemo(() => {
    if (!scrubbing) return [];
    const date = new Date(scrubMs);
    const out: ScrubGhost[] = [];
    for (const sat of ghostSats) {
      const pos = propagateSatellite(sat.tle, date);
      if (!pos) continue;
      out.push({
        id: sat.id,
        name: sat.name,
        group: sat.group,
        color: GROUP_COLORS[sat.group as SatelliteGroup] || '#00d4ff',
        lat: pos.lat,
        lng: pos.lng,
        alt: pos.alt / EARTH_RADIUS_KM,
        altKm: pos.alt,
        velocity: pos.velocity,
      });
    }
    return out;
  }, [scrubbing, scrubMs, ghostSats]);

  return {
    enabled,
    scrubbing,
    nowMs,
    scrubMs,
    offsetSec: timeOffsetSec,
    ghosts,
    tracks,
    tracksOmitted: Math.max(0, selectedSats.length - trackSats.length),
  };
}
