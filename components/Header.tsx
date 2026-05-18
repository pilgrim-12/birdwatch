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

  const isMobileGroupsExpanded = useSatelliteStore((s) => s.isMobileGroupsExpanded);
  const isMobileControlsOpen = useSatelliteStore((s) => s.isMobileControlsOpen);
  const toggleMobileGroups = useSatelliteStore((s) => s.toggleMobileGroups);
  const toggleMobileControls = useSatelliteStore((s) => s.toggleMobileControls);
  const isOrbitViewOpen = useSatelliteStore((s) => s.isOrbitViewOpen);
  const toggleOrbitView = useSatelliteStore((s) => s.toggleOrbitView);

  const toggleBtnClass = (active: boolean, activeColor = 'cyan') => {
    const colorMap: Record<string, string> = {
      cyan: active
        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
        : 'bg-gray-800 text-gray-500 border border-gray-700 hover:text-gray-300',
      indigo: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
      yellow: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
    };
    if (activeColor === 'night') {
      return active ? colorMap.indigo : colorMap.yellow;
    }
    return colorMap[activeColor] || colorMap.cyan;
  };

  return (
    <header className="shrink-0 bg-gray-900 border-b border-gray-800 px-4 md:px-6 py-2 flex flex-col gap-2">
      {/* Row 1: Title + controls */}
      <div className="flex items-center gap-3 md:gap-4">
        <h1 className="text-lg font-semibold tracking-tight text-white">BirdWatch</h1>
        <span className="text-xs text-gray-500 hidden sm:inline">Real-time satellite tracker</span>

        {/* Desktop controls — hidden on mobile */}
        <div className="ml-auto hidden md:flex items-center gap-2">
          {observer && (
            <span className="text-xs text-orange-400 mr-2">
              Observer: {observer.lat.toFixed(2)}&deg;, {observer.lng.toFixed(2)}&deg;
            </span>
          )}

          <button
            onClick={toggleTrajectories}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${toggleBtnClass(showTrajectories)}`}
          >
            Orbits
          </button>

          <button
            onClick={toggleBeams}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${toggleBtnClass(showBeams)}`}
          >
            Beams
          </button>

          <button
            onClick={toggleLabels}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${toggleBtnClass(showLabels)}`}
          >
            Labels
          </button>

          <button
            onClick={toggleNightMode}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${toggleBtnClass(nightMode, 'night')}`}
          >
            {nightMode ? 'Night' : 'Day'}
          </button>

          <button
            onClick={toggleOrbitView}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${toggleBtnClass(isOrbitViewOpen)}`}
          >
            Orbit View
          </button>

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

        {/* Mobile controls — visible only on mobile */}
        <div className="ml-auto flex items-center gap-2 md:hidden">
          <button
            onClick={toggleMobileGroups}
            className={`px-2.5 py-2 rounded text-xs font-medium transition-colors border ${
              isMobileGroupsExpanded
                ? 'bg-gray-700 text-white border-gray-600'
                : 'bg-gray-800 text-gray-400 border-gray-700 active:bg-gray-700'
            }`}
          >
            Groups{activeGroups.length > 0 ? ` (${activeGroups.length})` : ''}
          </button>
          <button
            onClick={toggleMobileControls}
            className={`w-9 h-9 flex items-center justify-center rounded transition-colors border ${
              isMobileControlsOpen
                ? 'bg-gray-700 text-white border-gray-600'
                : 'bg-gray-800 text-gray-400 border-gray-700 active:bg-gray-700'
            }`}
            title="Controls"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10 3.75a2 2 0 1 0-4 0 2 2 0 0 0 4 0ZM17.25 4.5a.75.75 0 0 0 0-1.5h-5.5a.75.75 0 0 0 0 1.5h5.5ZM5 3.75a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 .75.75ZM4.25 17a.75.75 0 0 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5h1.5ZM17.25 17a.75.75 0 0 0 0-1.5h-5.5a.75.75 0 0 0 0 1.5h5.5ZM9 10a2 2 0 1 1 4 0 2 2 0 0 1-4 0ZM7.75 10.75a.75.75 0 0 1-.75-.75.75.75 0 0 1 .75-.75h-5a.75.75 0 0 0 0 1.5h5ZM17.25 10.75a.75.75 0 0 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5h1.5ZM14 16.25a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile controls dropdown */}
      {isMobileControlsOpen && (
        <div className="md:hidden flex flex-wrap items-center gap-2 py-1 border-t border-gray-800">
          <button
            onClick={toggleTrajectories}
            className={`min-h-[44px] px-4 rounded text-xs font-medium transition-colors ${toggleBtnClass(showTrajectories)}`}
          >
            Orbits
          </button>

          <button
            onClick={toggleBeams}
            className={`min-h-[44px] px-4 rounded text-xs font-medium transition-colors ${toggleBtnClass(showBeams)}`}
          >
            Beams
          </button>

          <button
            onClick={toggleLabels}
            className={`min-h-[44px] px-4 rounded text-xs font-medium transition-colors ${toggleBtnClass(showLabels)}`}
          >
            Labels
          </button>

          <button
            onClick={toggleNightMode}
            className={`min-h-[44px] px-4 rounded text-xs font-medium transition-colors ${toggleBtnClass(nightMode, 'night')}`}
          >
            {nightMode ? 'Night' : 'Day'}
          </button>

          <button
            onClick={toggleOrbitView}
            className={`min-h-[44px] px-4 rounded text-xs font-medium transition-colors ${toggleBtnClass(isOrbitViewOpen)}`}
          >
            Orbit View
          </button>

          {showBeams && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Opacity</span>
              <input
                type="range"
                min={0}
                max={100}
                value={beamOpacity}
                onChange={(e) => setBeamOpacity(Number(e.target.value))}
                className="w-20 h-1 accent-cyan-500"
              />
            </div>
          )}

          {observer && (
            <span className="text-xs text-orange-400">
              Observer: {observer.lat.toFixed(2)}&deg;, {observer.lng.toFixed(2)}&deg;
            </span>
          )}
        </div>
      )}

      {/* Satellite group selector */}
      <div
        className={`${
          isMobileGroupsExpanded ? 'flex' : 'hidden'
        } md:flex items-center gap-1.5 flex-nowrap overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 md:flex-wrap md:overflow-visible md:pb-0 md:mx-0 md:px-0`}
      >
        <span className="text-xs text-gray-500 mr-1 shrink-0">Groups:</span>
        <button
          onClick={() => setActiveGroups([...ALLOWED_GROUPS.filter((g) => g !== 'active')])}
          className="shrink-0 px-3 py-2 md:px-1.5 md:py-0.5 min-h-[44px] md:min-h-0 rounded text-xs text-gray-400 border border-gray-700 hover:text-white hover:border-gray-500 transition-colors"
        >
          All
        </button>
        <button
          onClick={() => setActiveGroups([])}
          className="shrink-0 px-3 py-2 md:px-1.5 md:py-0.5 min-h-[44px] md:min-h-0 rounded text-xs text-gray-400 border border-gray-700 hover:text-white hover:border-gray-500 transition-colors"
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
              className={`shrink-0 md:shrink px-3 py-2 md:px-2 md:py-0.5 min-h-[44px] md:min-h-0 rounded text-xs transition-colors border flex items-center gap-1 ${
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
