'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { useTimeScrub, TRACK_LIMIT } from '@/hooks/useTimeScrub';
import { propagateSatellite } from '@/lib/sgp4';
import { calculateLookAngles } from '@/lib/observer';
import { parseTleEpoch } from '@/lib/tle';
import { GROUP_COLORS } from '@/lib/constants';
import type { SatelliteGroup } from '@/lib/constants';

const RATES = [1, 10, 60, 600] as const;
const WINDOWS: { label: string; sec: number }[] = [
  { label: '15m', sec: 900 },
  { label: '90m', sec: 5400 },
  { label: '6h', sec: 21_600 },
  { label: '24h', sec: 86_400 },
];

function formatOffset(sec: number): string {
  const rounded = Math.round(sec);
  if (rounded === 0) return 'LIVE';
  const sign = rounded < 0 ? '−' : '+';
  const abs = Math.abs(rounded);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  if (h > 0) return `${sign}${h}h ${m}m`;
  if (m > 0) return `${sign}${m}m ${s.toString().padStart(2, '0')}s`;
  return `${sign}${s}s`;
}

function formatWindowEdge(sec: number, sign: '-' | '+'): string {
  if (sec >= 3600) return `${sign}${Math.round(sec / 3600)}h`;
  return `${sign}${Math.round(sec / 60)}m`;
}

function formatAge(ms: number): string {
  const h = ms / 3_600_000;
  if (h < 1) return `${Math.round(ms / 60_000)}m`;
  if (h < 48) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

export default function TimelineBar() {
  const isTimelineOpen = useSatelliteStore((s) => s.isTimelineOpen);
  const selectedSatIds = useSatelliteStore((s) => s.selectedSatIds);
  const satellites = useSatelliteStore((s) => s.satellites);
  const massSatellites = useSatelliteStore((s) => s.massSatellites);
  const observer = useSatelliteStore((s) => s.observer);
  const timeOffsetSec = useSatelliteStore((s) => s.timeOffsetSec);
  const timeWindowSec = useSatelliteStore((s) => s.timeWindowSec);
  const timePlaying = useSatelliteStore((s) => s.timePlaying);
  const timeRate = useSatelliteStore((s) => s.timeRate);

  const setTimelineOpen = useSatelliteStore((s) => s.setTimelineOpen);
  const setTimeOffsetSec = useSatelliteStore((s) => s.setTimeOffsetSec);
  const nudgeTimeOffset = useSatelliteStore((s) => s.nudgeTimeOffset);
  const setTimeWindowSec = useSatelliteStore((s) => s.setTimeWindowSec);
  const toggleTimePlaying = useSatelliteStore((s) => s.toggleTimePlaying);
  const setTimeRate = useSatelliteStore((s) => s.setTimeRate);
  const resetTimeOffset = useSatelliteStore((s) => s.resetTimeOffset);

  // Tracks are drawn by the map views — the bar only needs the clock
  const { enabled, scrubMs, nowMs, tracksOmitted } = useTimeScrub({ withTracks: false });

  // Playback loop — advances the offset at `timeRate` seconds per real second.
  // Store writes are throttled to ~10 Hz; the ghost marker stays smooth enough.
  useEffect(() => {
    if (!enabled || !timePlaying) return;
    let raf = 0;
    let last = performance.now();
    let lastWrite = last;
    let pending = 0;

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const state = useSatelliteStore.getState();
      pending += ((t - last) / 1000) * state.timeRate;
      last = t;
      if (t - lastWrite < 100) return;
      lastWrite = t;

      const next = state.timeOffsetSec + pending;
      pending = 0;
      if (next >= state.timeWindowSec) {
        state.setTimeOffsetSec(state.timeWindowSec);
        state.toggleTimePlaying(); // stop at the end of the window
        return;
      }
      state.setTimeOffsetSec(next);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled, timePlaying]);

  // Keyboard: arrows step, space play/pause, Esc closes
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        nudgeTimeOffset(e.shiftKey ? -600 : -60);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nudgeTimeOffset(e.shiftKey ? 600 : 60);
      } else if (e.key === ' ') {
        e.preventDefault();
        toggleTimePlaying();
      } else if (e.key === 'Escape') {
        setTimelineOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, nudgeTimeOffset, toggleTimePlaying, setTimelineOpen]);

  // Primary satellite = last one selected
  const primary = useMemo(() => {
    const id = selectedSatIds[selectedSatIds.length - 1];
    if (id === undefined) return null;
    return satellites.find((s) => s.id === id) ?? massSatellites.find((s) => s.id === id) ?? null;
  }, [selectedSatIds, satellites, massSatellites]);

  const primaryPos = useMemo(
    () => (primary ? propagateSatellite(primary.tle, new Date(scrubMs)) : null),
    [primary, scrubMs],
  );

  const look = useMemo(
    () => (primary && observer ? calculateLookAngles(primary.tle, observer, new Date(scrubMs)) : null),
    [primary, observer, scrubMs],
  );

  const tleAgeMs = useMemo(() => {
    if (!primary) return null;
    const epoch = parseTleEpoch(primary.tle.line1);
    return epoch ? scrubMs - epoch.getTime() : null;
  }, [primary, scrubMs]);

  const handleSlider = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setTimeOffsetSec(Number(e.target.value)),
    [setTimeOffsetSec],
  );

  if (!isTimelineOpen) return null;

  const scrubDate = new Date(scrubMs);
  const utc = scrubDate.toISOString();
  const isLive = Math.round(timeOffsetSec) === 0;
  const primaryColor = primary
    ? GROUP_COLORS[primary.group as SatelliteGroup] || '#00d4ff'
    : '#00d4ff';

  return (
    <div className="absolute z-20 bottom-20 left-3 right-3 md:bottom-4 md:left-4 md:right-[17.5rem] bg-gray-900/95 backdrop-blur-sm border border-gray-700/60 rounded-lg shadow-xl">
      {selectedSatIds.length === 0 ? (
        <div className="flex items-center gap-2 px-3 py-2.5">
          <span className="text-[11px] text-gray-400">
            Select a satellite to scrub its position through time
          </span>
          <button
            onClick={() => setTimelineOpen(false)}
            className="ml-auto text-gray-500 hover:text-red-400 text-sm leading-none"
            title="Close timeline"
          >
            &times;
          </button>
        </div>
      ) : (
        <div className="px-3 py-2 space-y-2">
          {/* Row 1 — time readout */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-mono text-white tabular-nums">
              {utc.slice(11, 19)}
              <span className="text-[10px] text-gray-500 ml-1">UTC</span>
            </span>
            <span className="text-[11px] text-gray-500 font-mono hidden sm:inline">
              {utc.slice(0, 10)}
            </span>
            <span className="text-[11px] text-gray-400 font-mono">
              {scrubDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              <span className="text-[10px] text-gray-600 ml-1">local</span>
            </span>
            <span
              className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                isLive
                  ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              }`}
            >
              {formatOffset(timeOffsetSec)}
            </span>
            {tleAgeMs !== null && (
              <span
                className={`text-[10px] ${Math.abs(tleAgeMs) > 3 * 86_400_000 ? 'text-amber-400' : 'text-gray-500'}`}
                title="Age of the TLE used for this prediction — accuracy degrades with age"
              >
                TLE {formatAge(Math.abs(tleAgeMs))}
              </span>
            )}
            {tracksOmitted > 0 && (
              <span className="text-[10px] text-gray-500" title={`Ground tracks are drawn for the ${TRACK_LIMIT} most recently selected satellites`}>
                +{tracksOmitted} without track
              </span>
            )}
            <button
              onClick={() => setTimelineOpen(false)}
              className="ml-auto text-gray-500 hover:text-red-400 text-base leading-none px-1"
              title="Close timeline (Esc)"
            >
              &times;
            </button>
          </div>

          {/* Row 2 — transport controls */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => nudgeTimeOffset(-600)}
              className="px-1.5 py-1 rounded text-[11px] font-mono bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
              title="Back 10 minutes"
            >
              &laquo;10m
            </button>
            <button
              onClick={() => nudgeTimeOffset(-60)}
              className="px-1.5 py-1 rounded text-[11px] font-mono bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
              title="Back 1 minute (Left arrow)"
            >
              &lsaquo;1m
            </button>
            <button
              onClick={toggleTimePlaying}
              className={`w-8 h-7 rounded flex items-center justify-center transition-colors border ${
                timePlaying
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-gray-800 text-gray-300 border-gray-700 hover:text-white hover:border-gray-500'
              }`}
              title={timePlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {timePlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M5 3.5h2.5v9H5v-9Zm3.5 0H11v9H8.5v-9Z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M4.5 3.2v9.6a.5.5 0 0 0 .76.43l7.5-4.8a.5.5 0 0 0 0-.86l-7.5-4.8a.5.5 0 0 0-.76.43Z" />
                </svg>
              )}
            </button>
            <button
              onClick={() => nudgeTimeOffset(60)}
              className="px-1.5 py-1 rounded text-[11px] font-mono bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
              title="Forward 1 minute (Right arrow)"
            >
              1m&rsaquo;
            </button>
            <button
              onClick={() => nudgeTimeOffset(600)}
              className="px-1.5 py-1 rounded text-[11px] font-mono bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
              title="Forward 10 minutes"
            >
              10m&raquo;
            </button>

            <div className="w-px h-5 bg-gray-700 mx-0.5" />

            <div className="flex items-center gap-0.5 bg-gray-800/60 rounded p-0.5">
              {RATES.map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRate(r)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    timeRate === r ? 'bg-cyan-600/80 text-white' : 'text-gray-500 hover:text-gray-300'
                  }`}
                  title={`Play at ${r}× real time`}
                >
                  {r}&times;
                </button>
              ))}
            </div>

            <div className="hidden sm:flex items-center gap-0.5 bg-gray-800/60 rounded p-0.5">
              {WINDOWS.map((w) => (
                <button
                  key={w.sec}
                  onClick={() => setTimeWindowSec(w.sec)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    timeWindowSec === w.sec ? 'bg-gray-600 text-white' : 'text-gray-500 hover:text-gray-300'
                  }`}
                  title={`Scrub window ±${w.label}`}
                >
                  {w.label}
                </button>
              ))}
            </div>

            <button
              onClick={resetTimeOffset}
              disabled={isLive}
              className={`ml-auto px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                isLive
                  ? 'bg-gray-800/50 text-gray-600 border-gray-800 cursor-default'
                  : 'bg-green-600/20 text-green-300 border-green-500/40 hover:bg-green-600/30'
              }`}
              title="Jump back to live"
            >
              Now
            </button>
          </div>

          {/* Row 3 — slider */}
          <div>
            <input
              type="range"
              min={-timeWindowSec}
              max={timeWindowSec}
              step={1}
              value={Math.round(timeOffsetSec)}
              onChange={handleSlider}
              className="w-full h-1 accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
              <span>{formatWindowEdge(timeWindowSec, '-')}</span>
              <span className="text-gray-500">
                now {new Date(nowMs).toISOString().slice(11, 16)}Z
              </span>
              <span>{formatWindowEdge(timeWindowSec, '+')}</span>
            </div>
          </div>

          {/* Row 4 — primary satellite readout at the scrubbed moment */}
          {primary && (
            <div className="flex items-center gap-2 flex-wrap text-[11px] border-t border-gray-800 pt-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: primaryColor }} />
              <span className="text-gray-200 font-medium truncate max-w-[180px]">{primary.name}</span>
              {primaryPos ? (
                <>
                  <span className="text-gray-400 font-mono">
                    {primaryPos.lat.toFixed(2)}&deg;, {primaryPos.lng.toFixed(2)}&deg;
                  </span>
                  <span className="text-gray-500 font-mono">{primaryPos.alt.toFixed(0)} km</span>
                  <span className="text-gray-500 font-mono">{primaryPos.velocity.toFixed(2)} km/s</span>
                </>
              ) : (
                <span className="text-amber-400">no solution at this time</span>
              )}
              {look && (
                <span
                  className={`font-mono ${look.elevation >= 0 ? 'text-cyan-300' : 'text-gray-600'}`}
                  title="Elevation / azimuth / slant range from your observer location"
                >
                  el {look.elevation.toFixed(0)}&deg; &middot; az {look.azimuth.toFixed(0)}&deg; &middot; {look.rangeSat.toFixed(0)} km
                  {look.elevation < 0 ? ' (below horizon)' : ''}
                </span>
              )}
              {!observer && (
                <span className="text-gray-600">set observer for el/az</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
