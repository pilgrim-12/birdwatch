'use client';

import { useState, useMemo } from 'react';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { useShallow } from 'zustand/react/shallow';
import { ALLOWED_GROUPS, GROUP_LABELS, GROUP_COLORS, GROUP_INFO } from '@/lib/constants';
import type { SatelliteGroup } from '@/lib/constants';
import { CountryFlag } from '@/components/CountryFlag';
import { getUniqueCountries, groupMatchesCountry, COUNTRY_FLAG_MAP } from '@/lib/countryFlags';

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

export default function MobileMenu() {
  const {
    showTrajectories, showLabels, showBeams, nightMode,
    beamOpacity, beamWidth, beamSpeed,
    showLookLine, showGroundLine, showFootprint, showFlags,
    showGroundStations,
    activeGroups, countryFilter, observer,
    mapMode, sourceCelestrak, sourceSatnogs,
    isMobileMenuOpen, isOrbitViewOpen,
  } = useSatelliteStore(useShallow((s) => ({
    showTrajectories: s.showTrajectories,
    showLabels: s.showLabels,
    showBeams: s.showBeams,
    nightMode: s.nightMode,
    beamOpacity: s.beamOpacity,
    beamWidth: s.beamWidth,
    beamSpeed: s.beamSpeed,
    showLookLine: s.showLookLine,
    showGroundLine: s.showGroundLine,
    showFootprint: s.showFootprint,
    showFlags: s.showFlags,
    showGroundStations: s.showGroundStations,
    activeGroups: s.activeGroups,
    countryFilter: s.countryFilter,
    observer: s.observer,
    mapMode: s.mapMode,
    sourceCelestrak: s.sourceCelestrak,
    sourceSatnogs: s.sourceSatnogs,
    isMobileMenuOpen: s.isMobileMenuOpen,
    isOrbitViewOpen: s.isOrbitViewOpen,
  })));

  const {
    toggleTrajectories, toggleLabels, toggleBeams,
    toggleLookLine, toggleGroundLine, toggleFootprint, toggleFlags,
    toggleGroundStations,
    toggleNightMode, toggleGroup, toggleOrbitView, toggleMapMode,
    toggleSourceCelestrak, toggleSourceSatnogs,
    setBeamOpacity, setBeamWidth, setBeamSpeed,
    setActiveGroups, setCountryFilter, setObserver,
    setMobileMenuOpen, openAntennaGuide,
  } = useSatelliteStore(useShallow((s) => ({
    toggleTrajectories: s.toggleTrajectories,
    toggleLabels: s.toggleLabels,
    toggleBeams: s.toggleBeams,
    toggleLookLine: s.toggleLookLine,
    toggleGroundLine: s.toggleGroundLine,
    toggleFootprint: s.toggleFootprint,
    toggleFlags: s.toggleFlags,
    toggleGroundStations: s.toggleGroundStations,
    toggleNightMode: s.toggleNightMode,
    toggleGroup: s.toggleGroup,
    toggleOrbitView: s.toggleOrbitView,
    toggleMapMode: s.toggleMapMode,
    toggleSourceCelestrak: s.toggleSourceCelestrak,
    toggleSourceSatnogs: s.toggleSourceSatnogs,
    setBeamOpacity: s.setBeamOpacity,
    setBeamWidth: s.setBeamWidth,
    setBeamSpeed: s.setBeamSpeed,
    setActiveGroups: s.setActiveGroups,
    setCountryFilter: s.setCountryFilter,
    setObserver: s.setObserver,
    setMobileMenuOpen: s.setMobileMenuOpen,
    openAntennaGuide: s.openAntennaGuide,
  })));

  const [infoGroup, setInfoGroup] = useState<string | null>(null);

  const availableCountries = useMemo(() => getUniqueCountries(), []);
  const filteredGroups = useMemo(() => {
    const base = ALLOWED_GROUPS.filter((g) => g !== 'active');
    if (!countryFilter) return base;
    return base.filter((g) => groupMatchesCountry(g, countryFilter));
  }, [countryFilter]);

  if (!isMobileMenuOpen) return null;

  return (
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
            onClick={toggleGroundLine}
            className={`min-h-[48px] px-3 rounded-lg text-sm font-medium transition-colors ${toggleBtnClass(showGroundLine)}`}
          >
            LOS
          </button>
          <button
            onClick={toggleFootprint}
            className={`min-h-[48px] px-3 rounded-lg text-sm font-medium transition-colors ${toggleBtnClass(showFootprint)}`}
          >
            FOV
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
            onClick={toggleFlags}
            className={`min-h-[48px] px-3 rounded-lg text-sm font-medium transition-colors ${toggleBtnClass(showFlags)}`}
          >
            Flags
          </button>
          <button
            onClick={toggleGroundStations}
            className={`min-h-[48px] px-3 rounded-lg text-sm font-medium transition-colors ${toggleBtnClass(showGroundStations)}`}
          >
            Stations
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
        {/* Country Filter (mobile) */}
        <div className="mb-4">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Filter by Country
          </h3>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setCountryFilter(null)}
              className={`px-3 py-1.5 rounded text-xs transition-colors border ${
                countryFilter === null
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                  : 'bg-gray-800/50 text-gray-500 border-gray-700 active:bg-gray-800'
              }`}
            >
              All
            </button>
            {availableCountries.map((country) => {
              const isActive = countryFilter === country;
              const isoCode = COUNTRY_FLAG_MAP[country];
              return (
                <button
                  key={country}
                  onClick={() => setCountryFilter(isActive ? null : country)}
                  className={`px-3 py-1.5 rounded text-xs transition-colors border flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                      : 'bg-gray-800/50 text-gray-500 border-gray-700 active:bg-gray-800'
                  }`}
                >
                  {isoCode ? (
                    <span className={`fi fi-${isoCode}`} style={{ width: 16, height: 12, display: 'inline-block', backgroundSize: 'cover' }} />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
                      <ellipse cx="8" cy="8" rx="3" ry="6.5" fill="none" stroke="currentColor" strokeWidth="1" />
                      <line x1="1.5" y1="8" x2="14.5" y2="8" stroke="currentColor" strokeWidth="0.8" />
                    </svg>
                  )}
                  {country}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider">
            Satellite Groups ({activeGroups.length}{countryFilter ? ` / ${filteredGroups.length} shown` : ''})
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
          {filteredGroups.map((group) => {
            const isActive = activeGroups.includes(group);
            const color = GROUP_COLORS[group as SatelliteGroup];
            const info = GROUP_INFO[group as SatelliteGroup];
            return (
              <button
                key={group}
                onClick={() => toggleGroup(group as SatelliteGroup)}
                className={`min-h-[48px] px-3 rounded-lg text-sm transition-colors border flex items-center gap-2 ${
                  isActive
                    ? 'text-white'
                    : 'bg-gray-800/50 text-gray-500 border-gray-700 active:bg-gray-800'
                }`}
                style={isActive ? {
                  backgroundColor: `${color}18`,
                  borderColor: `${color}50`,
                } : undefined}
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: isActive ? color : '#6b7280' }}
                />
                <CountryFlag group={group} size="md" />
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
        <div className="text-xs text-gray-400 space-y-1.5">
          <p>Have questions, ideas or suggestions? Reach out:</p>
          <div className="flex items-center gap-3">
            <a href="mailto:yurachernov12@gmail.com" className="text-cyan-400 underline">
              yurachernov12@gmail.com
            </a>
            <a href="https://www.linkedin.com/in/yurii-chernov/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline inline-flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              LinkedIn
            </a>
          </div>
          <p className="text-gray-500">Data: CelesTrak TLE + SatNOGS DB</p>
        </div>
      </div>
    </div>
  );
}
