'use client';

import { useEffect, useState, useRef } from 'react';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import type { SatellitePass } from '@/lib/passes';

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(start: Date, end: Date): string {
  const mins = Math.round((end.getTime() - start.getTime()) / 60_000);
  return `${mins} min`;
}

export default function SatelliteList() {
  const satellites = useSatelliteStore((s) => s.satellites);
  const positions = useSatelliteStore((s) => s.positions);
  const selectedSatId = useSatelliteStore((s) => s.selectedSatId);
  const selectSatellite = useSatelliteStore((s) => s.selectSatellite);
  const observer = useSatelliteStore((s) => s.observer);
  const passes = useSatelliteStore((s) => s.passes);
  const setPasses = useSatelliteStore((s) => s.setPasses);

  const [detailSatId, setDetailSatId] = useState<number | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Compute passes in a Web Worker when observer or satellites change
  useEffect(() => {
    if (!observer || satellites.length === 0) {
      setPasses([]);
      return;
    }

    // Terminate previous worker if still running
    if (workerRef.current) {
      workerRef.current.terminate();
    }

    const worker = new Worker(
      new URL('../workers/passes.worker.ts', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const rawPasses = e.data as {
        satId: number;
        satName: string;
        startTime: number;
        peakTime: number;
        endTime: number;
        peakElevation: number;
      }[];
      // Convert timestamps back to Date objects
      const parsed: SatellitePass[] = rawPasses.map((p) => ({
        satId: p.satId,
        satName: p.satName,
        startTime: new Date(p.startTime),
        peakTime: new Date(p.peakTime),
        endTime: new Date(p.endTime),
        peakElevation: p.peakElevation,
      }));
      setPasses(parsed);
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
    };

    worker.postMessage({
      satellites: satellites.map((s) => ({ id: s.id, name: s.name, tle: s.tle })),
      observer,
      hoursAhead: 24,
    });

    return () => {
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
    };
  }, [observer, satellites, setPasses]);

  // If a satellite is selected and observer is set, filter passes for that satellite
  const visiblePasses =
    selectedSatId !== null ? passes.filter((p) => p.satId === selectedSatId) : passes;

  const detailPos = detailSatId !== null ? positions.get(detailSatId) : undefined;
  const detailSat = detailSatId !== null ? satellites.find((s) => s.id === detailSatId) : null;

  return (
    <aside className="w-80 shrink-0 bg-gray-900 border-l border-gray-800 overflow-y-auto flex flex-col relative">
      {/* Satellite list — always visible */}
      <div className="p-4 flex-1">
        <h2 className="text-lg font-semibold mb-4 text-white">
          Satellites ({satellites.length})
        </h2>
        <ul className="space-y-0.5">
          {satellites.map((sat) => {
            const pos = positions.get(sat.id);
            const isSelected = sat.id === selectedSatId;
            return (
              <li key={sat.id}>
                <div
                  className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors flex items-center gap-1 cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/15 border border-cyan-500/30'
                      : 'hover:bg-gray-800 border border-transparent'
                  }`}
                  onClick={() => selectSatellite(isSelected ? null : sat.id)}
                >
                  <span
                    className={`font-medium truncate flex-1 ${
                      isSelected ? 'text-cyan-300' : 'text-gray-200'
                    }`}
                  >
                    {sat.name}
                  </span>
                  {pos && (
                    <span className="text-gray-500 text-xs shrink-0">
                      {pos.alt.toFixed(0)} km
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailSatId(detailSatId === sat.id ? null : sat.id);
                    }}
                    className="ml-1 w-5 h-5 rounded flex items-center justify-center text-gray-500 hover:text-white hover:bg-gray-700 transition-colors shrink-0"
                    title="Show details"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className="w-3.5 h-3.5"
                    >
                      <path
                        fillRule="evenodd"
                        d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Observer & passes section */}
      {observer && (
        <div className="border-t border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-orange-400">Observer</h3>
            <span className="text-xs text-gray-400 font-mono">
              {observer.lat.toFixed(2)}&deg;, {observer.lng.toFixed(2)}&deg;
            </span>
          </div>

          {visiblePasses.length > 0 ? (
            <div>
              <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                Passes (24h) &middot; {visiblePasses.length}
              </h4>
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {visiblePasses.slice(0, 20).map((pass, i) => (
                  <li
                    key={`${pass.satId}-${i}`}
                    className="text-xs bg-gray-800/50 rounded px-2 py-1.5 cursor-pointer hover:bg-gray-800 transition-colors"
                    onClick={() => selectSatellite(pass.satId)}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-gray-200 font-medium truncate">
                        {pass.satName}
                      </span>
                      <span className="text-green-400 font-mono shrink-0">
                        {pass.peakElevation.toFixed(0)}&deg;
                      </span>
                    </div>
                    <div className="text-gray-500 mt-0.5">
                      {formatTime(pass.startTime)} &ndash; {formatTime(pass.endTime)}
                      <span className="ml-2">
                        ({formatDuration(pass.startTime, pass.endTime)})
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-gray-500">Click globe to set observer location</p>
          )}
        </div>
      )}

      {!observer && (
        <div className="border-t border-gray-800 p-4">
          <p className="text-xs text-gray-500">Click on the globe to set observer location</p>
        </div>
      )}

      {/* Detail popup */}
      {detailSat && detailPos && (
        <div className="absolute inset-x-4 top-16 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">{detailSat.name}</h3>
            <button
              onClick={() => setDetailSatId(null)}
              className="text-gray-400 hover:text-white text-lg leading-none"
            >
              &times;
            </button>
          </div>
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between">
              <dt className="text-gray-400">Latitude</dt>
              <dd className="text-white font-mono">{detailPos.lat.toFixed(4)}&deg;</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Longitude</dt>
              <dd className="text-white font-mono">{detailPos.lng.toFixed(4)}&deg;</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Altitude</dt>
              <dd className="text-white font-mono">{detailPos.alt.toFixed(1)} km</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Velocity</dt>
              <dd className="text-white font-mono">{detailPos.velocity.toFixed(2)} km/s</dd>
            </div>
          </dl>
        </div>
      )}
    </aside>
  );
}
