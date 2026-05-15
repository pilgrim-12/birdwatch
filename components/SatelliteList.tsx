'use client';

import { useSatelliteStore } from '@/store/useSatelliteStore';

export default function SatelliteList() {
  const satellites = useSatelliteStore((s) => s.satellites);
  const positions = useSatelliteStore((s) => s.positions);
  const selectedSatId = useSatelliteStore((s) => s.selectedSatId);
  const selectSatellite = useSatelliteStore((s) => s.selectSatellite);

  const selectedSat = selectedSatId !== null ? satellites.find((s) => s.id === selectedSatId) : null;
  const selectedPos = selectedSatId !== null ? positions.get(selectedSatId) : undefined;

  return (
    <aside className="w-80 shrink-0 bg-gray-900 border-l border-gray-800 overflow-y-auto p-4">
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
            <div>
              <dt className="text-gray-400">Latitude</dt>
              <dd className="text-white">{selectedPos.lat.toFixed(4)}&deg;</dd>
            </div>
            <div>
              <dt className="text-gray-400">Longitude</dt>
              <dd className="text-white">{selectedPos.lng.toFixed(4)}&deg;</dd>
            </div>
            <div>
              <dt className="text-gray-400">Altitude</dt>
              <dd className="text-white">{selectedPos.alt.toFixed(1)} km</dd>
            </div>
            <div>
              <dt className="text-gray-400">Velocity</dt>
              <dd className="text-white">{selectedPos.velocity.toFixed(2)} km/s</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div>
          <h2 className="text-lg font-semibold mb-4 text-white">
            Satellites ({satellites.length})
          </h2>
          <ul className="space-y-1">
            {satellites.map((sat) => {
              const pos = positions.get(sat.id);
              return (
                <li key={sat.id}>
                  <button
                    onClick={() => selectSatellite(sat.id)}
                    className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-gray-800 transition-colors"
                  >
                    <span className="font-medium text-gray-200">{sat.name}</span>
                    {pos && (
                      <span className="text-gray-500 ml-2">{pos.alt.toFixed(0)} km</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </aside>
  );
}
