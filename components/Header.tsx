'use client';

import { useState, useRef, useEffect } from 'react';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { ALLOWED_GROUPS, GROUP_LABELS, GROUP_COLORS } from '@/lib/constants';
import type { SatelliteGroup } from '@/lib/constants';

export default function Header() {
  const showTrajectories = useSatelliteStore((s) => s.showTrajectories);
  const showLabels = useSatelliteStore((s) => s.showLabels);
  const showBeams = useSatelliteStore((s) => s.showBeams);
  const nightMode = useSatelliteStore((s) => s.nightMode);
  const beamOpacity = useSatelliteStore((s) => s.beamOpacity);
  const beamWidth = useSatelliteStore((s) => s.beamWidth);
  const beamSpeed = useSatelliteStore((s) => s.beamSpeed);
  const activeGroups = useSatelliteStore((s) => s.activeGroups);
  const toggleTrajectories = useSatelliteStore((s) => s.toggleTrajectories);
  const toggleLabels = useSatelliteStore((s) => s.toggleLabels);
  const toggleBeams = useSatelliteStore((s) => s.toggleBeams);
  const toggleNightMode = useSatelliteStore((s) => s.toggleNightMode);
  const setBeamOpacity = useSatelliteStore((s) => s.setBeamOpacity);
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
  const openAntennaGuide = useSatelliteStore((s) => s.openAntennaGuide);

  // Desktop settings dropdown
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!settingsOpen) return;
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [settingsOpen]);

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
      <header className="shrink-0 bg-gray-900 border-b border-gray-800 px-4 md:px-5 py-1.5">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold tracking-tight text-white shrink-0">BirdWatch</h1>

          {/* Desktop: single row — observer + toggles + settings gear */}
          <div className="ml-auto hidden md:flex items-center gap-1.5">
            {observer && (
              <span className="text-[11px] text-orange-400 mr-1 flex items-center gap-0.5">
                {observer.lat.toFixed(2)}&deg;, {observer.lng.toFixed(2)}&deg;
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
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${toggleBtnClass(showTrajectories)}`}
            >
              Orbits
            </button>
            <button
              onClick={toggleBeams}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${toggleBtnClass(showBeams)}`}
            >
              Beams
            </button>
            <button
              onClick={toggleLabels}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${toggleBtnClass(showLabels)}`}
            >
              Labels
            </button>
            <button
              onClick={toggleNightMode}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${toggleBtnClass(nightMode, 'night')}`}
            >
              {nightMode ? 'Night' : 'Day'}
            </button>

            <div className="w-px h-5 bg-gray-700" />

            <button
              onClick={toggleOrbitView}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${toggleBtnClass(isOrbitViewOpen)}`}
            >
              Orbit
            </button>
            <button
              onClick={() => openAntennaGuide()}
              className="px-2 py-1 rounded text-[11px] font-medium transition-colors bg-gray-800 text-gray-500 border border-gray-700 hover:text-gray-300"
            >
              Ant.
            </button>

            {/* Settings gear — opens dropdown with groups + beam sliders */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
                  settingsOpen
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-gray-500 hover:text-white hover:bg-gray-800 border border-gray-700'
                }`}
                title="Groups & settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Dropdown panel */}
              {settingsOpen && (
                <div className="absolute right-0 top-full mt-1 w-[420px] bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 p-3 space-y-3">
                  {/* Beam sliders */}
                  {showBeams && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">Beam Settings</span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 flex-1">
                          <span className="text-[10px] text-gray-400 w-14">Thickness</span>
                          <input type="range" min={1} max={10} value={beamWidth}
                            onChange={(e) => setBeamWidth(Number(e.target.value))}
                            className="flex-1 h-1 accent-cyan-500" />
                          <span className="text-[10px] text-gray-500 w-5 text-right">{beamWidth}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 flex-1">
                          <span className="text-[10px] text-gray-400 w-14">Speed</span>
                          <input type="range" min={0} max={3} value={beamSpeed}
                            onChange={(e) => setBeamSpeed(Number(e.target.value))}
                            className="flex-1 h-1 accent-cyan-500" />
                          <span className="text-[10px] text-gray-500 w-5 text-right">{['Off', 'Slow', 'Med', 'Fast'][beamSpeed]}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 flex-1">
                          <span className="text-[10px] text-gray-400 w-14">Opacity</span>
                          <input type="range" min={0} max={100} value={beamOpacity}
                            onChange={(e) => setBeamOpacity(Number(e.target.value))}
                            className="flex-1 h-1 accent-cyan-500" />
                          <span className="text-[10px] text-gray-500 w-5 text-right">{beamOpacity}%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Groups */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                        Satellite Groups ({activeGroups.length})
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setActiveGroups([...ALLOWED_GROUPS.filter((g) => g !== 'active')])}
                          className="px-1.5 py-0.5 rounded text-[10px] text-gray-400 border border-gray-700 hover:text-white hover:border-gray-500 transition-colors"
                        >
                          All
                        </button>
                        <button
                          onClick={() => setActiveGroups([])}
                          className="px-1.5 py-0.5 rounded text-[10px] text-gray-400 border border-gray-700 hover:text-white hover:border-gray-500 transition-colors"
                        >
                          None
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {ALLOWED_GROUPS.filter((g) => g !== 'active').map((group) => {
                        const isActive = activeGroups.includes(group);
                        const color = GROUP_COLORS[group as SatelliteGroup];
                        return (
                          <button
                            key={group}
                            onClick={() => toggleGroup(group as SatelliteGroup)}
                            className={`px-2 py-1 rounded text-[11px] transition-colors border flex items-center gap-1 ${
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
                  </div>
                </div>
              )}
            </div>
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
              <button
                onClick={() => { openAntennaGuide(); setMobileMenuOpen(false); }}
                className="min-h-[48px] px-3 rounded-lg text-sm font-medium transition-colors bg-gray-800 text-gray-500 border border-gray-700 active:text-gray-300"
              >
                Antennas
              </button>
            </div>
            {showBeams && (
              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">Thickness</span>
                  <input type="range" min={1} max={10} value={beamWidth}
                    onChange={(e) => setBeamWidth(Number(e.target.value))}
                    className="flex-1 h-2 accent-cyan-500" />
                  <span className="text-xs text-gray-500 w-8 text-right">{beamWidth}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">Speed</span>
                  <input type="range" min={0} max={3} value={beamSpeed}
                    onChange={(e) => setBeamSpeed(Number(e.target.value))}
                    className="flex-1 h-2 accent-cyan-500" />
                  <span className="text-xs text-gray-500 w-8 text-right">
                    {['Off', 'Slow', 'Med', 'Fast'][beamSpeed]}
                  </span>
                </div>
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
