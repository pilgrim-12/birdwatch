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
  const beamMode = useSatelliteStore((s) => s.beamMode);
  const beamWidth = useSatelliteStore((s) => s.beamWidth);
  const beamSpeed = useSatelliteStore((s) => s.beamSpeed);
  const activeGroups = useSatelliteStore((s) => s.activeGroups);
  const toggleTrajectories = useSatelliteStore((s) => s.toggleTrajectories);
  const toggleLabels = useSatelliteStore((s) => s.toggleLabels);
  const toggleBeams = useSatelliteStore((s) => s.toggleBeams);
  const toggleNightMode = useSatelliteStore((s) => s.toggleNightMode);
  const setBeamOpacity = useSatelliteStore((s) => s.setBeamOpacity);
  const setBeamMode = useSatelliteStore((s) => s.setBeamMode);
  const setBeamWidth = useSatelliteStore((s) => s.setBeamWidth);
  const setBeamSpeed = useSatelliteStore((s) => s.setBeamSpeed);
  const toggleGroup = useSatelliteStore((s) => s.toggleGroup);
  const setActiveGroups = useSatelliteStore((s) => s.setActiveGroups);
  const observer = useSatelliteStore((s) => s.observer);
  const setObserver = useSatelliteStore((s) => s.setObserver);

  const isMobileMenuOpen = useSatelliteStore((s) => s.isMobileMenuOpen);
  const setMobileMenuOpen = useSatelliteStore((s) => s.setMobileMenuOpen);
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
    <>
      <header className="shrink-0 bg-gray-900 border-b border-gray-800 px-4 md:px-6 py-2 flex flex-col gap-2">
        {/* Row 1: Title + controls */}
        <div className="flex items-center gap-3 md:gap-4">
          <h1 className="text-lg font-semibold tracking-tight text-white">BirdWatch</h1>
          <span className="text-xs text-gray-500 hidden sm:inline">Real-time satellite tracker</span>

          {/* Desktop controls — hidden on mobile */}
          <div className="ml-auto hidden md:flex items-center gap-2">
            {observer && (
              <span className="text-xs text-orange-400 mr-2 flex items-center gap-1">
                Observer: {observer.lat.toFixed(2)}&deg;, {observer.lng.toFixed(2)}&deg;
                <button
                  onClick={() => setObserver(null)}
                  className="ml-0.5 text-gray-500 hover:text-red-400 transition-colors"
                  title="Clear observer"
                >
                  &times;
                </button>
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
              <div className="flex items-center gap-2 ml-1 border-l border-gray-700 pl-2">
                {/* Mode pills */}
                {(['line', 'cone', 'footprint'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setBeamMode(mode)}
                    className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                      beamMode === mode
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {mode === 'line' ? 'Line' : mode === 'cone' ? 'Cone' : 'Footprint'}
                  </button>
                ))}
                {/* Width slider (cone/footprint only) */}
                {beamMode !== 'line' && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-500">Width</span>
                    <input type="range" min={1} max={30} value={beamWidth}
                      onChange={(e) => setBeamWidth(Number(e.target.value))}
                      className="w-14 h-1 accent-cyan-500" />
                    <span className="text-[10px] text-gray-500 w-5">{beamWidth}&deg;</span>
                  </div>
                )}
                {/* Speed slider */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-500">Speed</span>
                  <input type="range" min={0} max={3} value={beamSpeed}
                    onChange={(e) => setBeamSpeed(Number(e.target.value))}
                    className="w-10 h-1 accent-cyan-500" />
                </div>
                {/* Opacity slider */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-500">Opacity</span>
                  <input type="range" min={0} max={100} value={beamOpacity}
                    onChange={(e) => setBeamOpacity(Number(e.target.value))}
                    className="w-14 h-1 accent-cyan-500" />
                </div>
              </div>
            )}
          </div>

          {/* Mobile: compact right side */}
          <div className="ml-auto flex items-center gap-2 md:hidden">
            {observer && (
              <span className="text-[10px] text-orange-400 flex items-center gap-0.5">
                {observer.lat.toFixed(1)}&deg;, {observer.lng.toFixed(1)}&deg;
                <button
                  onClick={() => setObserver(null)}
                  className="text-gray-500 active:text-red-400 ml-0.5"
                  title="Clear observer"
                >
                  &times;
                </button>
              </span>
            )}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-800 text-gray-300 border border-gray-700 active:bg-gray-700"
              title="Menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Desktop: Satellite group selector (always visible) */}
        <div className="hidden md:flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-gray-500 mr-1 shrink-0">Groups:</span>
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

      {/* Mobile full-screen menu overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-gray-950 flex flex-col overflow-y-auto">
          {/* Menu header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white">Settings</h2>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-800 text-gray-400 active:bg-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>

          {/* Controls section */}
          <div className="px-4 py-4 border-b border-gray-800">
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Display</h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={toggleTrajectories}
                className={`min-h-[48px] px-3 rounded-lg text-sm font-medium transition-colors ${toggleBtnClass(showTrajectories)}`}
              >
                Orbits
              </button>
              <button
                onClick={toggleBeams}
                className={`min-h-[48px] px-3 rounded-lg text-sm font-medium transition-colors ${toggleBtnClass(showBeams)}`}
              >
                Beams
              </button>
              <button
                onClick={toggleLabels}
                className={`min-h-[48px] px-3 rounded-lg text-sm font-medium transition-colors ${toggleBtnClass(showLabels)}`}
              >
                Labels
              </button>
              <button
                onClick={toggleNightMode}
                className={`min-h-[48px] px-3 rounded-lg text-sm font-medium transition-colors ${toggleBtnClass(nightMode, 'night')}`}
              >
                {nightMode ? 'Night' : 'Day'}
              </button>
              <button
                onClick={() => { toggleOrbitView(); setMobileMenuOpen(false); }}
                className={`min-h-[48px] px-3 rounded-lg text-sm font-medium transition-colors ${toggleBtnClass(isOrbitViewOpen)}`}
              >
                Orbit View
              </button>
            </div>
            {showBeams && (
              <div className="mt-3 space-y-3">
                {/* Beam mode */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400 shrink-0">Mode</span>
                  <div className="flex gap-1 flex-1">
                    {(['line', 'cone', 'footprint'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setBeamMode(mode)}
                        className={`flex-1 min-h-[36px] rounded-lg text-xs font-medium transition-colors ${
                          beamMode === mode
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            : 'bg-gray-800 text-gray-500 border border-gray-700'
                        }`}
                      >
                        {mode === 'line' ? 'Line' : mode === 'cone' ? 'Cone' : 'Footprint'}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Beam width (cone/footprint only) */}
                {beamMode !== 'line' && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">Beam Width</span>
                    <input type="range" min={1} max={30} value={beamWidth}
                      onChange={(e) => setBeamWidth(Number(e.target.value))}
                      className="flex-1 h-2 accent-cyan-500" />
                    <span className="text-xs text-gray-500 w-8 text-right">{beamWidth}&deg;</span>
                  </div>
                )}
                {/* Speed */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">Speed</span>
                  <input type="range" min={0} max={3} value={beamSpeed}
                    onChange={(e) => setBeamSpeed(Number(e.target.value))}
                    className="flex-1 h-2 accent-cyan-500" />
                  <span className="text-xs text-gray-500 w-8 text-right">
                    {['Off', 'Slow', 'Med', 'Fast'][beamSpeed]}
                  </span>
                </div>
                {/* Opacity */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">Opacity</span>
                  <input type="range" min={0} max={100} value={beamOpacity}
                    onChange={(e) => setBeamOpacity(Number(e.target.value))}
                    className="flex-1 h-2 accent-cyan-500" />
                  <span className="text-xs text-gray-500 w-8 text-right">{beamOpacity}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Observer section */}
          <div className="px-4 py-4 border-b border-gray-800">
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Observer</h3>
            {observer ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-orange-400">
                  {observer.lat.toFixed(4)}&deg;, {observer.lng.toFixed(4)}&deg;
                </span>
                <button
                  onClick={() => setObserver(null)}
                  className="px-3 py-1.5 rounded-lg text-xs text-red-400 border border-red-500/30 bg-red-500/10 active:bg-red-500/20"
                >
                  Clear
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Tap on the globe to set observer location</p>
            )}
          </div>

          {/* Groups section */}
          <div className="px-4 py-4 flex-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs text-gray-500 uppercase tracking-wider">
                Satellite Groups ({activeGroups.length})
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveGroups([...ALLOWED_GROUPS.filter((g) => g !== 'active')])}
                  className="px-3 py-1.5 rounded text-xs text-gray-400 border border-gray-700 active:bg-gray-800"
                >
                  All
                </button>
                <button
                  onClick={() => setActiveGroups([])}
                  className="px-3 py-1.5 rounded text-xs text-gray-400 border border-gray-700 active:bg-gray-800"
                >
                  None
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ALLOWED_GROUPS.filter((g) => g !== 'active').map((group) => {
                const isActive = activeGroups.includes(group);
                const color = GROUP_COLORS[group as SatelliteGroup];
                return (
                  <button
                    key={group}
                    onClick={() => toggleGroup(group as SatelliteGroup)}
                    className={`min-h-[48px] px-3 rounded-lg text-sm transition-colors border flex items-center gap-2 ${
                      isActive
                        ? 'bg-gray-800 border-gray-600 text-gray-200'
                        : 'bg-gray-800/50 text-gray-500 border-gray-700 active:bg-gray-800'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: isActive ? color : '#6b7280' }}
                    />
                    {GROUP_LABELS[group as SatelliteGroup]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
