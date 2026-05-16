'use client';

import { useEffect } from 'react';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { findPasses } from '@/lib/passes';

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

  // Compute passes when observer or satellites change
  useEffect(() => {
    if (!observer || satellites.length === 0) {
      setPasses([]);
      return;
    }
    const result = findPasses(
      satellites.map((s) => ({ id: s.id, name: s.name, tle: s.tle })),
      observer,
      24,
    );
    setPasses(result);
  }, [observer, satellites, setPasses]);

  const selectedSat =
    selectedSatId !== null ? satellites.find((s) => s.id === selectedSatId) : null;
  const selectedPos = selectedSatId !== null ? positions.get(selectedSatId) : undefined;

  // If a satellite is selected and observer is set, filter passes for that satellite
  const visiblePasses =
    selectedSatId !== null ? passes.filter((p) => p.satId === selectedSatId) : passes;

  return (
    <aside className="w-80 shrink-0 bg-gray-900 border-l border-gray-800 overflow-y-auto flex flex-col">
      {/* Satellite detail or list */}
      <div className="p-4 flex-1">
        {selectedSat && selectedPos ? (
          <div>
            <button
              onClick={() => selectSatellite(null)}
              className="text-sm text-gray-400 hover:text-white mb-4"
            >
              &larr; Back to list
            </button>
            <h2 className="text-lg font-semibold mb-4 text-white">{selectedSat.name}</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-400">Latitude</dt>
                <dd className="text-white font-mono">{selectedPos.lat.toFixed(4)}&deg;</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Longitude</dt>
                <dd className="text-white font-mono">{selectedPos.lng.toFixed(4)}&deg;</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Altitude</dt>
                <dd className="text-white font-mono">{selectedPos.alt.toFixed(1)} km</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Velocity</dt>
                <dd className="text-white font-mono">{selectedPos.velocity.toFixed(2)} km/s</dd>
              </div>
            </dl>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold mb-4 text-white">
              Satellites ({satellites.length})
            </h2>
            <ul className="space-y-0.5">
              {satellites.map((sat) => {
                const pos = positions.get(sat.id);
                return (
                  <li key={sat.id}>
                    <button
                      onClick={() => selectSatellite(sat.id)}
                      className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-gray-800 transition-colors flex justify-between"
                    >
                      <span className="font-medium text-gray-200 truncate">{sat.name}</span>
                      {pos && (
                        <span className="text-gray-500 ml-2 shrink-0">
                          {pos.alt.toFixed(0)} km
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
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
    </aside>
  );
}
