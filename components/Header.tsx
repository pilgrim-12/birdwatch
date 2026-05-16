'use client';

import { useSatelliteStore } from '@/store/useSatelliteStore';

export default function Header() {
  const showTrajectories = useSatelliteStore((s) => s.showTrajectories);
  const showLabels = useSatelliteStore((s) => s.showLabels);
  const toggleTrajectories = useSatelliteStore((s) => s.toggleTrajectories);
  const toggleLabels = useSatelliteStore((s) => s.toggleLabels);
  const observer = useSatelliteStore((s) => s.observer);

  return (
    <header className="h-14 shrink-0 bg-gray-900 border-b border-gray-800 flex items-center px-6 gap-4">
      <h1 className="text-lg font-semibold tracking-tight text-white">BirdWatch</h1>
      <span className="text-xs text-gray-500 hidden sm:inline">Real-time satellite tracker</span>

      <div className="ml-auto flex items-center gap-2">
        {observer && (
          <span className="text-xs text-orange-400 mr-2 hidden md:inline">
            Observer: {observer.lat.toFixed(2)}&deg;, {observer.lng.toFixed(2)}&deg;
          </span>
        )}

        <button
          onClick={toggleTrajectories}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            showTrajectories
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              : 'bg-gray-800 text-gray-500 border border-gray-700 hover:text-gray-300'
          }`}
        >
          Orbits
        </button>

        <button
          onClick={toggleLabels}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            showLabels
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              : 'bg-gray-800 text-gray-500 border border-gray-700 hover:text-gray-300'
          }`}
        >
          Labels
        </button>
      </div>
    </header>
  );
}
