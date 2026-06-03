'use client';

import { useMemo } from 'react';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { GROUP_COLORS } from '@/lib/constants';
import type { SatelliteGroup } from '@/lib/constants';

export default function SelectedPanel() {
  const selectedSatIds = useSatelliteStore((s) => s.selectedSatIds);
  const satellites = useSatelliteStore((s) => s.satellites);
  const massSatellites = useSatelliteStore((s) => s.massSatellites);
  const deselectSatellite = useSatelliteStore((s) => s.deselectSatellite);
  const clearSelection = useSatelliteStore((s) => s.clearSelection);
  const positions = useSatelliteStore((s) => s.positions);
  const massPositions = useSatelliteStore((s) => s.massPositions);

  const selectedSats = useMemo(() => {
    const allSats = [...satellites, ...massSatellites];
    const satMap = new Map(allSats.map((s) => [s.id, s]));
    return selectedSatIds
      .map((id) => satMap.get(id))
      .filter((s): s is NonNullable<typeof s> => s != null);
  }, [selectedSatIds, satellites, massSatellites]);

  if (selectedSats.length === 0) return null;

  return (
    <div className="absolute bottom-4 right-4 z-20 w-64 bg-gray-900/90 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/50">
        <span className="text-xs font-medium text-gray-300">
          Selected ({selectedSats.length})
        </span>
        <button
          onClick={clearSelection}
          className="text-gray-500 hover:text-red-400 transition-colors text-xs"
          title="Clear all"
        >
          Clear all
        </button>
      </div>

      {/* List */}
      <div className="max-h-[200px] overflow-y-auto">
        {selectedSats.map((sat) => {
          const color = GROUP_COLORS[sat.group as SatelliteGroup] || '#00d4ff';
          const pos = positions.get(sat.id) ?? massPositions.get(sat.id);
          return (
            <div
              key={sat.id}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-800/50 transition-colors group"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-[11px] text-gray-200 truncate flex-1">
                {sat.name}
              </span>
              {pos && (
                <span className="text-[10px] text-gray-500 shrink-0">
                  {pos.alt.toFixed(0)} km
                </span>
              )}
              <button
                onClick={() => deselectSatellite(sat.id)}
                className="w-4 h-4 flex items-center justify-center rounded text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                title="Remove"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                  <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
