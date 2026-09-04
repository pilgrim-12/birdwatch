'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { useShallow } from 'zustand/react/shallow';
import { ALLOWED_GROUPS, GROUP_LABELS, GROUP_COLORS, GROUP_INFO } from '@/lib/constants';
import type { SatelliteGroup } from '@/lib/constants';
import { CountryFlag } from '@/components/CountryFlag';
import { getUniqueCountries, groupMatchesCountry, COUNTRY_FLAG_MAP } from '@/lib/countryFlags';
import HeaderSearch from '@/components/HeaderSearch';
import MobileMenu from '@/components/MobileMenu';
import ShareButton from '@/components/ShareButton';

export default function Header() {
  const {
    showTrajectories, showLabels, showBeams, nightMode,
    beamOpacity, beamWidth, beamSpeed,
    showLookLine, showGroundLine, showFootprint, showFlags,
    showGroundStations, statusFilter,
    activeGroups, countryFilter, observer, observerLabel,
    mapMode, sourceCelestrak, sourceSatnogs, sourceSpacetrack, spacetrackConfigured,
    isOrbitViewOpen, isTimelineOpen,
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
    statusFilter: s.statusFilter,
    activeGroups: s.activeGroups,
    countryFilter: s.countryFilter,
    observer: s.observer,
    observerLabel: s.observerLabel,
    mapMode: s.mapMode,
    sourceCelestrak: s.sourceCelestrak,
    sourceSatnogs: s.sourceSatnogs,
    sourceSpacetrack: s.sourceSpacetrack,
    spacetrackConfigured: s.spacetrackConfigured,
    isOrbitViewOpen: s.isOrbitViewOpen,
    isTimelineOpen: s.isTimelineOpen,
  })));

  const {
    toggleTrajectories, toggleLabels, toggleBeams,
    toggleLookLine, toggleGroundLine, toggleFootprint, toggleFlags,
    toggleGroundStations,
    toggleNightMode, toggleGroup, toggleOrbitView, toggleMapMode, toggleTimeline,
    toggleSourceCelestrak, toggleSourceSatnogs, toggleSourceSpacetrack,
    setBeamOpacity, setBeamWidth, setBeamSpeed,
    setActiveGroups, setCountryFilter, setObserver,
    setStatusFilter,
    setMobileMenuOpen, openAntennaGuide, setObserverPickerOpen,
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
    toggleTimeline: s.toggleTimeline,
    toggleMapMode: s.toggleMapMode,
    toggleSourceCelestrak: s.toggleSourceCelestrak,
    toggleSourceSatnogs: s.toggleSourceSatnogs,
    toggleSourceSpacetrack: s.toggleSourceSpacetrack,
    setStatusFilter: s.setStatusFilter,
    setBeamOpacity: s.setBeamOpacity,
    setBeamWidth: s.setBeamWidth,
    setBeamSpeed: s.setBeamSpeed,
    setActiveGroups: s.setActiveGroups,
    setCountryFilter: s.setCountryFilter,
    setObserver: s.setObserver,
    setMobileMenuOpen: s.setMobileMenuOpen,
    openAntennaGuide: s.openAntennaGuide,
    setObserverPickerOpen: s.setObserverPickerOpen,
  })));

  const availableCountries = useMemo(() => getUniqueCountries(), []);
  const filteredGroups = useMemo(() => {
    const base = ALLOWED_GROUPS.filter((g) => g !== 'active');
    if (!countryFilter) return base;
    return base.filter((g) => groupMatchesCountry(g, countryFilter));
  }, [countryFilter]);

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
              <polygon points="12,23 1,3 23,3" fill="currentColor" />
              <path d="M12,8 Q9,6 5,7 Q8,9 9,12 L12,10 L15,12 Q16,9 19,7 Q15,6 12,8Z" fill="#111827" />
              <path d="M11,13 L12,17 L13,13 Z" fill="#111827" />
            </svg>
            BirdWatches
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
              <div className="absolute left-0 top-full mt-1 w-[370px] bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 text-blue-400 shrink-0">
                    <polygon points="12,23 1,3 23,3" fill="currentColor" />
                    <path d="M12,8 Q9,6 5,7 Q8,9 9,12 L12,10 L15,12 Q16,9 19,7 Q15,6 12,8Z" fill="#111827" />
                    <path d="M11,13 L12,17 L13,13 Z" fill="#111827" />
                  </svg>
                  <span className="text-sm font-semibold text-white">BirdWatches</span>
                  <span className="text-[10px] text-gray-500 ml-auto">Real-Time Satellite Tracker</span>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  Real-time satellite tracking platform with interactive 3D globe and 2D flat map visualization.
                  Designed for amateur radio operators, space enthusiasts, and satellite communication professionals.
                </p>
                <div className="text-[10px] text-gray-400 space-y-1.5 pt-1 border-t border-gray-700/50">
                  <p className="text-gray-500 uppercase tracking-wider font-medium">Features</p>
                  <ul className="space-y-0.5 ml-2">
                    <li><span className="text-gray-500 mr-1">&bull;</span>3D Globe &amp; 2D Map views with day/night textures</li>
                    <li><span className="text-gray-500 mr-1">&bull;</span>30+ satellite constellations &mdash; Starlink, ISS, NOAA, Iridium, and more</li>
                    <li><span className="text-gray-500 mr-1">&bull;</span>Live orbital positions via SGP4 propagation</li>
                    <li><span className="text-gray-500 mr-1">&bull;</span>Pass predictions with elevation, azimuth &amp; visibility</li>
                    <li><span className="text-gray-500 mr-1">&bull;</span>CPA (Closest Point of Approach) &amp; LOS (Line of Sight) analysis</li>
                    <li><span className="text-gray-500 mr-1">&bull;</span>Radio frequency data from SatNOGS database</li>
                    <li><span className="text-gray-500 mr-1">&bull;</span>Antenna pointing guide for ground station operators</li>
                  </ul>
                </div>
                <div className="text-[10px] text-gray-400 pt-1 border-t border-gray-700/50 space-y-1">
                  <p><span className="text-gray-500">Data sources:</span> CelesTrak TLE &bull; SatNOGS DB</p>
                  <p className="text-gray-300 leading-relaxed pt-1">
                    Have questions, ideas or suggestions? Reach out:
                  </p>
                  <div className="flex items-center gap-3">
                    <a href="mailto:yurachernov12@gmail.com" className="text-cyan-400 hover:underline">
                      yurachernov12@gmail.com
                    </a>
                    <a href="https://www.linkedin.com/in/yurii-chernov/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline inline-flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-3 h-3 fill-current"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                      LinkedIn
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Desktop: single row — observer + toggles + settings gear */}
          <div className="ml-auto hidden md:flex items-center gap-1.5">
            {observer ? (
              <span className="text-[11px] text-orange-400 mr-1 flex items-center gap-0.5">
                <button
                  onClick={() => setObserverPickerOpen(true)}
                  className="hover:text-orange-300 transition-colors"
                  title="Change observer location"
                >
                  {observerLabel ? `${observerLabel} · ` : ''}
                  {observer.lat.toFixed(2)}&deg;, {observer.lng.toFixed(2)}&deg;
                </button>
                <button
                  onClick={() => setObserver(null)}
                  className="ml-0.5 text-gray-500 hover:text-red-400 transition-colors"
                  title="Clear observer"
                >
                  &times;
                </button>
              </span>
            ) : (
              <button
                onClick={() => setObserverPickerOpen(true)}
                className="mr-1 px-2 py-1 rounded text-[11px] font-medium bg-orange-500/15 text-orange-300 border border-orange-500/30 hover:bg-orange-500/25 transition-colors flex items-center gap-1"
                title="Set your location to get passes, look angles and visibility"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M9.69 18.933l.003.001A.752.752 0 0 0 10 19a.75.75 0 0 0 .307-.067l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .31-.15 22.916 22.916 0 0 0 3.434-2.414C15.818 14.867 17.5 12.5 17.5 9.5a7.5 7.5 0 1 0-15 0c0 3 1.682 5.367 3.423 6.857a22.916 22.916 0 0 0 3.744 2.564l.018.008.006.003ZM10 11.75a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
                </svg>
                Set location
              </button>
            )}

            <HeaderSearch />

            <div className="w-px h-5 bg-gray-700" />

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
              onClick={toggleGroundLine}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${toggleBtnClass(showGroundLine)}`}
              title="Line of sight from observer to satellite"
            >
              LOS
            </button>
            <button
              onClick={toggleFootprint}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${toggleBtnClass(showFootprint)}`}
              title="Satellite visibility footprint on ground"
            >
              FOV
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
              onClick={toggleFlags}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${toggleBtnClass(showFlags)}`}
            >
              Flags
            </button>
            <button
              onClick={toggleGroundStations}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${toggleBtnClass(showGroundStations)}`}
              title="Ground tracking stations (SatNOGS + DSN + ESTRACK)"
            >
              GS
            </button>
            <div className="flex items-center gap-0.5 bg-gray-800/50 rounded p-0.5">
              {(['all', 'alive', 'dead'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    statusFilter === f
                      ? f === 'dead' ? 'bg-gray-600 text-gray-200' : f === 'alive' ? 'bg-green-600/80 text-white' : 'bg-cyan-600/80 text-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'alive' ? 'Live' : 'Dead'}
                </button>
              ))}
            </div>
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
              onClick={toggleTimeline}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${toggleBtnClass(isTimelineOpen)}`}
              title="Time machine — scrub the selected satellite forward/backward in time"
            >
              Time
            </button>
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
            <ShareButton />

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
                  <rect x="9" y="9" width="6" height="6" rx="1" transform="rotate(45 12 12)" />
                  <line x1="5" y1="5" x2="8.5" y2="8.5" />
                  <rect x="2" y="2" width="5" height="5" rx="0.5" transform="rotate(45 4.5 4.5)" />
                  <line x1="15.5" y1="15.5" x2="19" y2="19" />
                  <rect x="17" y="17" width="5" height="5" rx="0.5" transform="rotate(45 19.5 19.5)" />
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
                      <label className={`flex items-start gap-2 p-2 rounded-lg border transition-colors cursor-pointer ${
                        sourceSpacetrack && spacetrackConfigured !== false
                          ? 'bg-gray-800 border-gray-600'
                          : 'bg-gray-800/30 border-gray-700 opacity-50'
                      }`}>
                        <input
                          type="checkbox"
                          checked={sourceSpacetrack && spacetrackConfigured !== false}
                          disabled={spacetrackConfigured === false}
                          onChange={toggleSourceSpacetrack}
                          className="mt-0.5 accent-cyan-500 shrink-0 disabled:cursor-not-allowed"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-medium text-gray-200">Space-Track</span>
                            <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">Supplemental</span>
                            {spacetrackConfigured === false && (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">Not configured</span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
                            The NORAD catalogue directly, for objects CelesTrak omits &mdash; it publishes nothing numbered above 99999.
                          </p>
                          {spacetrackConfigured === false && (
                            <p className="text-[10px] text-red-400/90 mt-1 leading-relaxed">
                              This deployment has no Space-Track account attached, so the source is inert. It is a server setting, not a sign-in: whoever runs the site adds SPACETRACK_IDENTITY and SPACETRACK_PASSWORD to the environment.
                            </p>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Country Filter */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                      Filter by Country
                    </span>
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => setCountryFilter(null)}
                        className={`px-2 py-1 rounded text-[11px] transition-colors border ${
                          countryFilter === null
                            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                            : 'bg-gray-800/50 text-gray-500 border-gray-700 hover:text-gray-300'
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
                            className={`px-2 py-1 rounded text-[11px] transition-colors border flex items-center gap-1 ${
                              isActive
                                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                                : 'bg-gray-800/50 text-gray-500 border-gray-700 hover:text-gray-300'
                            }`}
                          >
                            {isoCode ? (
                              <span className={`fi fi-${isoCode}`} style={{ width: 14, height: 10, display: 'inline-block', backgroundSize: 'cover' }} />
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
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

                  {/* Groups */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                        Satellite Groups ({activeGroups.length}{countryFilter ? ` / ${filteredGroups.length} shown` : ''})
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
                      {filteredGroups.map((group) => {
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
                                ? 'text-white'
                                : 'bg-gray-800/50 text-gray-500 border-gray-700 hover:text-gray-300'
                            }`}
                            style={isActive ? {
                              backgroundColor: `${color}18`,
                              borderColor: `${color}50`,
                            } : undefined}
                            title={info.description}
                          >
                            <span
                              className="w-2 h-2 rounded-full inline-block shrink-0"
                              style={{ backgroundColor: isActive ? color : '#6b7280' }}
                            />
                            <CountryFlag group={group} />
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
                          {info.coverageNote && (
                            <div className="flex gap-1.5 pt-1 border-t border-gray-700/50 text-amber-300/90 leading-relaxed">
                              <span aria-hidden>&#9888;</span>
                              <span>{info.coverageNote}</span>
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
            {observer ? (
              <span className="text-[10px] text-orange-400 flex items-center gap-0.5">
                <button onClick={() => setObserverPickerOpen(true)} className="active:text-orange-300">
                  {observer.lat.toFixed(1)}&deg;, {observer.lng.toFixed(1)}&deg;
                </button>
                <button
                  onClick={() => setObserver(null)}
                  className="text-gray-500 active:text-red-400 ml-0.5"
                  title="Clear observer"
                >
                  &times;
                </button>
              </span>
            ) : (
              <button
                onClick={() => setObserverPickerOpen(true)}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-orange-500/15 text-orange-300 border border-orange-500/30 active:bg-orange-500/25"
                title="Set your location"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M9.69 18.933l.003.001A.752.752 0 0 0 10 19a.75.75 0 0 0 .307-.067l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .31-.15 22.916 22.916 0 0 0 3.434-2.414C15.818 14.867 17.5 12.5 17.5 9.5a7.5 7.5 0 1 0-15 0c0 3 1.682 5.367 3.423 6.857a22.916 22.916 0 0 0 3.744 2.564l.018.008.006.003ZM10 11.75a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
                </svg>
              </button>
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

      <MobileMenu />
    </>
  );
}
