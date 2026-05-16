'use client';

import { useSatelliteStore } from '@/store/useSatelliteStore';
import { ALLOWED_GROUPS, GROUP_LABELS, GROUP_COLORS } from '@/lib/constants';
import type { SatelliteGroup } from '@/lib/constants';

export default function Header() {
  const showTrajectories = useSatelliteStore((s) => s.showTrajectories);
  const showLabels = useSatelliteStore((s) => s.showLabels);
  const showBeams = useSatelliteStore((s) => s.showBeams);
  const nightMode = useSatelliteStore((s) => s.nightMode);
  const beamOpacity = useSatelliteStore((s) => s.beamOpacity);
  const activeGroups = useSatelliteStore((s) => s.activeGroups);
  const toggleTrajectories = useSatelliteStore((s) => s.toggleTrajectories);
  const toggleLabels = useSatelliteStore((s) => s.toggleLabels);
  const toggleBeams = useSatelliteStore((s) => s.toggleBeams);
  const toggleNightMode = useSatelliteStore((s) => s.toggleNightMode);
  const setBeamOpacity = useSatelliteStore((s) => s.setBeamOpacity);
  const toggleGroup = useSatelliteStore((s) => s.toggleGroup);
  const setActiveGroups = useSatelliteStore((s) => s.setActiveGroups);
  const observer = useSatelliteStore((s) => s.observer);

  return (
    <header className="shrink-0 bg-gray-900 border-b border-gray-800 px-6 py-2 flex flex-col gap-2">
      <div className="flex items-center gap-4">
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
            onClick={toggleBeams}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              showBeams
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-gray-800 text-gray-500 border border-gray-700 hover:text-gray-300'
            }`}
          >
            Beams
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

          <button
            onClick={toggleNightMode}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              nightMode
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
            }`}
          >
            {nightMode ? 'Night' : 'Day'}
          </button>

          {/* Beam opacity slider */}
          {showBeams && (
            <div className="flex items-center gap-1.5 ml-1">
              <span className="text-xs text-gray-500">Opacity</span>
              <input
                type="range"
                min={0}
                max={100}
                value={beamOpacity}
                onChange={(e) => setBeamOpacity(Number(e.target.value))}
                className="w-16 h-1 accent-cyan-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Satellite group selector with group colors */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs text-gray-500 mr-1">Groups:</span>
        <button
          onClick={() => setActiveGroups([...ALLOWED_GROUPS.filter((g) => g !== 'active')])}
          className="px-1.5 py-0.5 rounded text-xs text-gray-400 border border-gray-700 hover:text-white hover:border-gray-500 transition-colors"
        >
          All
        </button>
        <button
          onClick={() => setActiveGroups([])}
          className="px-1.5 py-0.5 rounded text-xs text-gray-400 border border-gray-700 hover:text-white hover:border-gray-500 transition-colors"
        >
          None
        </button>
        {ALLOWED_GROUPS.filter((g) => g !== 'active').map((group) => {
          const isActive = activeGroups.includes(group);
          const color = GROUP_COLORS[group as SatelliteGroup];
          return (
            <button
              key={group}
              onClick={() => toggleGroup(group as SatelliteGroup)}
              className={`px-2 py-0.5 rounded text-xs transition-colors border flex items-center gap-1 ${
                isActive
                  ? 'bg-gray-800 border-gray-600 text-gray-200'
                  : 'bg-gray-800/50 text-gray-500 border-gray-700 hover:text-gray-300'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: isActive ? color : '#6b7280' }}
              />
              {GROUP_LABELS[group as SatelliteGroup]}
            </button>
          );
        })}
      </div>
    </header>
  );
}
