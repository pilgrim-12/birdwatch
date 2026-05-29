'use client';

import { useState, useRef, useEffect } from 'react';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { ALLOWED_GROUPS, GROUP_LABELS, GROUP_COLORS, GROUP_INFO } from '@/lib/constants';
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
  const showLookLine = useSatelliteStore((s) => s.showLookLine);
  const toggleLookLine = useSatelliteStore((s) => s.toggleLookLine);
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
  const mapMode = useSatelliteStore((s) => s.mapMode);
  const toggleMapMode = useSatelliteStore((s) => s.toggleMapMode);
  const sourceCelestrak = useSatelliteStore((s) => s.sourceCelestrak);
  const sourceSatnogs = useSatelliteStore((s) => s.sourceSatnogs);
  const toggleSourceCelestrak = useSatelliteStore((s) => s.toggleSourceCelestrak);
  const toggleSourceSatnogs = useSatelliteStore((s) => s.toggleSourceSatnogs);

  // Desktop settings dropdown
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoGroup, setInfoGroup] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);

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

  // Close about dropdown on outside click
  useEffect(() => {
    if (!aboutOpen) return;
    const handler = (e: MouseEvent) => {
      if (aboutRef.current && !aboutRef.current.contains(e.target as Node)) {
        setAboutOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [aboutOpen]);

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
          <h1 className="text-base font-semibold tracking-tight text-white shrink-0 flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 text-blue-400 shrink-0">
              {/* Sharp triangle pointing down */}
              <polygon points="12,23 1,3 23,3" fill="currentColor" />
              {/* Bird silhouette cutout — wings spread inside the triangle */}
              <path d="M12,8 Q9,6 5,7 Q8,9 9,12 L12,10 L15,12 Q16,9 19,7 Q15,6 12,8Z" fill="#111827" />
              {/* Bird tail */}
              <path d="M11,13 L12,17 L13,13 Z" fill="#111827" />
            </svg>
            BirdWatch
          </h1>

          {/* About dropdown */}
          <div className="relative hidden md:block" ref={aboutRef}>
            <button
              onClick={() => setAboutOpen(!aboutOpen)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                aboutOpen
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-gray-500 hover:text-gray-300 border border-transparent'
              }`}
            >
              About
            </button>
            {aboutOpen && (
              <div className="absolute left-0 top-full mt-1 w-[320px] bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 text-blue-400 shrink-0">
                    <polygon points="12,23 1,3 23,3" fill="currentColor" />
                    <path d="M12,8 Q9,6 5,7 Q8,9 9,12 L12,10 L15,12 Q16,9 19,7 Q15,6 12,8Z" fill="#111827" />
                    <path d="M11,13 L12,17 L13,13 Z" fill="#111827" />
                  </svg>
                  <span className="text-sm font-semibold text-white">BirdWatch</span>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  Real-time satellite tracker on a 3D globe. Built for amateur radio operators and space enthusiasts.
                  Track 30+ satellite constellations with live orbital positions, pass predictions, and radio frequency data.
                </p>
                <div className="text-[11px] text-gray-400 pt-1 border-t border-gray-700/50 space-y-1">
                  <p>
                    Questions or suggestions? Contact{' '}
                    <a href="mailto:yurachernov12@gmail.com" className="text-cyan-400 hover:underline">
                      yurachernov12@gmail.com
                    </a>
                  </p>
                  <p className="text-gray-500">Data: CelesTrak TLE + SatNOGS DB</p>
                </div>
              </div>
            )}
          </div>

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
              onClick={toggleLookLine}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${toggleBtnClass(showLookLine)}`}
              title="Closest approach line from observer to orbit"
            >
              CPA
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
            <button
              onClick={toggleMapMode}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${toggleBtnClass(mapMode === 'flat')}`}
              title={mapMode === 'globe' ? 'Switch to 2D flat map' : 'Switch to 3D globe'}
            >
              {mapMode === 'globe' ? '2D' : '3D'}
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
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                  {/* Satellite body */}
                  <rect x="9" y="9" width="6" height="6" rx="1" transform="rotate(45 12 12)" />
                  {/* Solar panels */}
                  <line x1="5" y1="5" x2="8.5" y2="8.5" />
                  <rect x="2" y="2" width="5" height="5" rx="0.5" transform="rotate(45 4.5 4.5)" />
                  <line x1="15.5" y1="15.5" x2="19" y2="19" />
                  <rect x="17" y="17" width="5" height="5" rx="0.5" transform="rotate(45 19.5 19.5)" />
                  {/* Signal waves */}
                  <path d="M6 18 C3 15, 3 9, 6 6" strokeWidth="1.5" />
                  <path d="M3 21 C-1 16, -1 8, 3 3" strokeWidth="1.5" />
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

                  {/* Data Sources */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Data Sources</span>
                    <div className="flex flex-col gap-1.5">
                      <label className={`flex items-start gap-2 p-2 rounded-lg border transition-colors cursor-pointer ${
                        sourceCelestrak ? 'bg-gray-800 border-gray-600' : 'bg-gray-800/30 border-gray-700 opacity-50'
                      }`}>
                        <input
                          type="checkbox"
                          checked={sourceCelestrak}
                          onChange={toggleSourceCelestrak}
                          className="mt-0.5 accent-cyan-500 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-medium text-gray-200">CelesTrak TLE</span>
                            <span className="text-[9px] px-1 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">Primary</span>
                          </div>
                          <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
                            NORAD orbital elements (TLE). Real-time satellite positions, orbits, pass predictions. Source: CelesTrak / US Space Command.
                          </p>
                        </div>
                      </label>
                      <label className={`flex items-start gap-2 p-2 rounded-lg border transition-colors cursor-pointer ${
                        sourceSatnogs ? 'bg-gray-800 border-gray-600' : 'bg-gray-800/30 border-gray-700 opacity-50'
                      }`}>
                        <input
                          type="checkbox"
                          checked={sourceSatnogs}
                          onChange={toggleSourceSatnogs}
                          className="mt-0.5 accent-cyan-500 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-medium text-gray-200">SatNOGS DB</span>
                            <span className="text-[9px] px-1 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">Enrichment</span>
                          </div>
                          <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
                            Satellite metadata &amp; transmitters. Adds status (alive/dead), operator, launch date, frequencies, modulation modes. Source: SatNOGS open network.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

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
                        const info = GROUP_INFO[group as SatelliteGroup];
                        return (
                          <button
                            key={group}
                            onClick={() => toggleGroup(group as SatelliteGroup)}
                            onContextMenu={(e) => { e.preventDefault(); setInfoGroup(infoGroup === group ? null : group); }}
                            className={`px-2 py-1 rounded text-[11px] transition-colors border flex items-center gap-1 ${
                              isActive
                                ? 'bg-gray-800 border-gray-600 text-gray-200'
                                : 'bg-gray-800/50 text-gray-500 border-gray-700 hover:text-gray-300'
                            }`}
                            title={info.description}
                          >
                            <span
                              className="w-2 h-2 rounded-full inline-block shrink-0"
                              style={{ backgroundColor: isActive ? color : '#6b7280' }}
                            />
                            {GROUP_LABELS[group as SatelliteGroup]}
                            <span className="text-[9px] text-gray-500">{info.count}</span>
                            <span
                              onClick={(e) => { e.stopPropagation(); setInfoGroup(infoGroup === group ? null : group); }}
                              className="ml-0.5 w-3.5 h-3.5 rounded-full inline-flex items-center justify-center text-[8px] border border-gray-600 text-gray-500 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-gray-700 transition-colors shrink-0"
                            >
                              i
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {/* Group info card */}
                    {infoGroup && GROUP_INFO[infoGroup as SatelliteGroup] && (() => {
                      const info = GROUP_INFO[infoGroup as SatelliteGroup];
                      const color = GROUP_COLORS[infoGroup as SatelliteGroup];
                      return (
                        <div className="mt-2 p-2.5 rounded-lg border border-gray-700 bg-gray-800/80 text-[11px] space-y-1.5">
                          <div className="flex items-center gap-1.5 font-semibold text-gray-200">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                            {GROUP_LABELS[infoGroup as SatelliteGroup]}
                            <span className="ml-auto text-[10px] font-normal px-1.5 py-0.5 rounded bg-gray-700 text-cyan-400">{info.purpose}</span>
                          </div>
                          <p className="text-gray-300 leading-relaxed">{info.description}</p>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-gray-400">
                            <span><span className="text-gray-500">Operator:</span> {info.operator}</span>
                            <span><span className="text-gray-500">Country:</span> {info.country}</span>
                            <span><span className="text-gray-500">Orbit:</span> {info.orbit}</span>
                            <span><span className="text-gray-500">Count:</span> {info.count}</span>
                            {info.since !== 'N/A' && <span><span className="text-gray-500">Since:</span> {info.since}</span>}
                          </div>
                          {info.frequency !== 'N/A (optical only)' && info.frequency !== 'N/A (passive laser retroreflectors)' && (
                            <div className="text-gray-400 pt-0.5 border-t border-gray-700/50">
                              <span className="text-gray-500">Freq:</span> {info.frequency}
                            </div>
                          )}
                        </div>
                      );
                    })()}
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
                onClick={toggleLookLine}
                className={`min-h-[48px] px-3 rounded-lg text-sm font-medium transition-colors ${toggleBtnClass(showLookLine)}`}
              >
                CPA
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
                onClick={() => { toggleMapMode(); setMobileMenuOpen(false); }}
                className={`min-h-[48px] px-3 rounded-lg text-sm font-medium transition-colors ${toggleBtnClass(mapMode === 'flat')}`}
              >
                {mapMode === 'globe' ? '2D Map' : '3D Globe'}
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

          {/* Data Sources section (mobile) */}
          <div className="px-4 py-4 border-b border-gray-800">
            <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Data Sources</h3>
            <div className="space-y-2">
              <label className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                sourceCelestrak ? 'bg-gray-800 border-gray-600' : 'bg-gray-800/30 border-gray-700 opacity-50'
              }`}>
                <input
                  type="checkbox"
                  checked={sourceCelestrak}
                  onChange={toggleSourceCelestrak}
                  className="mt-0.5 accent-cyan-500 w-4 h-4 shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-gray-200">CelesTrak TLE</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">Primary</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    NORAD orbital elements. Real-time positions, orbits, pass predictions.
                  </p>
                </div>
              </label>
              <label className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                sourceSatnogs ? 'bg-gray-800 border-gray-600' : 'bg-gray-800/30 border-gray-700 opacity-50'
              }`}>
                <input
                  type="checkbox"
                  checked={sourceSatnogs}
                  onChange={toggleSourceSatnogs}
                  className="mt-0.5 accent-cyan-500 w-4 h-4 shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-gray-200">SatNOGS DB</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">Enrichment</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Satellite metadata &amp; transmitters. Status, operator, launch date, frequencies.
                  </p>
                </div>
              </label>
            </div>
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
                const info = GROUP_INFO[group as SatelliteGroup];
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
                    <span className="flex-1 text-left">
                      {GROUP_LABELS[group as SatelliteGroup]}
                      <span className="ml-1 text-[10px] text-gray-500">{info.count}</span>
                    </span>
                    <span
                      onClick={(e) => { e.stopPropagation(); setInfoGroup(infoGroup === group ? null : group); }}
                      className="w-6 h-6 rounded-full inline-flex items-center justify-center text-[10px] border border-gray-600 text-gray-500 active:text-cyan-400 active:border-cyan-500/50 active:bg-gray-700 shrink-0"
                    >
                      i
                    </span>
                  </button>
                );
              })}
            </div>
            {/* Group info card (mobile) */}
            {infoGroup && GROUP_INFO[infoGroup as SatelliteGroup] && (() => {
              const info = GROUP_INFO[infoGroup as SatelliteGroup];
              const color = GROUP_COLORS[infoGroup as SatelliteGroup];
              return (
                <div className="mt-3 p-3 rounded-lg border border-gray-700 bg-gray-800/80 text-sm space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-gray-200">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    {GROUP_LABELS[infoGroup as SatelliteGroup]}
                    <span className="ml-auto text-[11px] font-normal px-2 py-0.5 rounded bg-gray-700 text-cyan-400">{info.purpose}</span>
                  </div>
                  <p className="text-gray-300 leading-relaxed text-xs">{info.description}</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-400">
                    <span><span className="text-gray-500">Operator:</span> {info.operator}</span>
                    <span><span className="text-gray-500">Country:</span> {info.country}</span>
                    <span><span className="text-gray-500">Orbit:</span> {info.orbit}</span>
                    <span><span className="text-gray-500">Count:</span> {info.count}</span>
                    {info.since !== 'N/A' && <span><span className="text-gray-500">Since:</span> {info.since}</span>}
                  </div>
                  {info.frequency !== 'N/A (optical only)' && info.frequency !== 'N/A (passive laser retroreflectors)' && (
                    <div className="text-xs text-gray-400 pt-1 border-t border-gray-700/50">
                      <span className="text-gray-500">Freq:</span> {info.frequency}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* About section (mobile) */}
          <div className="px-4 py-4 border-t border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 text-blue-400 shrink-0">
                <polygon points="12,23 1,3 23,3" fill="currentColor" />
                <path d="M12,8 Q9,6 5,7 Q8,9 9,12 L12,10 L15,12 Q16,9 19,7 Q15,6 12,8Z" fill="#111827" />
                <path d="M11,13 L12,17 L13,13 Z" fill="#111827" />
              </svg>
              <span className="text-sm font-semibold text-white">BirdWatch</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed mb-2">
              Real-time satellite tracker on a 3D globe. Built for amateur radio operators and space enthusiasts.
            </p>
            <div className="text-xs text-gray-400 space-y-1">
              <p>
                Questions or suggestions? Contact{' '}
                <a href="mailto:yurachernov12@gmail.com" className="text-cyan-400 underline">
                  yurachernov12@gmail.com
                </a>
              </p>
              <p className="text-gray-500">Data: CelesTrak TLE + SatNOGS DB</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
