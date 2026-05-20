'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { findPasses, getCurrentElevation } from '@/lib/passes';
import type { SatellitePass } from '@/lib/passes';
import { GROUP_COLORS } from '@/lib/constants';
import type { SatelliteGroup } from '@/lib/constants';
import type { SatellitePosition } from '@/types/satellite';
import { RadioBadge } from '@/components/radio/RadioBadge';
import { RadioDetail } from '@/components/radio/RadioDetail';
import {
  getRadioProfile,
  isReceivable,
} from '@/lib/radio/radioProfiles';
import { computeMaxDoppler } from '@/lib/radio/doppler';

const ITEM_HEIGHT = 36; // px per row
const OVERSCAN = 10;

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(start: Date, end: Date): string {
  const mins = Math.round((end.getTime() - start.getTime()) / 60_000);
  return `${mins} min`;
}

function formatLiveLabel(
  now: Date,
  pass: SatellitePass,
  timeText: string,
  tle: { name: string; line1: string; line2: string } | undefined,
  observer: { lat: number; lng: number; alt: number } | null,
): string {
  if (!tle || !observer) return `LIVE — ${timeText}`;
  const el = getCurrentElevation(tle, observer, now);
  if (el === null) return `LIVE — ${timeText}`;
  return `LIVE ${el.toFixed(0)}\u00B0 — ${timeText}`;
}

function formatCountdown(now: Date, pass: { startTime: Date; endTime: Date }): { text: string; isLive: boolean; urgency: 'past' | 'live' | 'soon' | 'normal' } {
  const msToStart = pass.startTime.getTime() - now.getTime();
  const msToEnd = pass.endTime.getTime() - now.getTime();

  if (msToEnd <= 0) return { text: 'passed', isLive: false, urgency: 'past' };
  if (msToStart <= 0) {
    const minLeft = Math.ceil(msToEnd / 60000);
    return { text: `${minLeft}m left`, isLive: true, urgency: 'live' };
  }

  const totalMin = Math.ceil(msToStart / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;

  const isSoon = totalMin <= 30;

  if (h > 0) return { text: `in ${h}h ${m}m`, isLive: false, urgency: isSoon ? 'soon' : 'normal' };
  return { text: `in ${m}m`, isLive: false, urgency: isSoon ? 'soon' : 'normal' };
}

export default function SatelliteList() {
  const satellites = useSatelliteStore((s) => s.satellites);
  const massSatellites = useSatelliteStore((s) => s.massSatellites);
  const positions = useSatelliteStore((s) => s.positions);
  const massPositions = useSatelliteStore((s) => s.massPositions);
  const selectedSatId = useSatelliteStore((s) => s.selectedSatId);
  const selectSatellite = useSatelliteStore((s) => s.selectSatellite);
  const observer = useSatelliteStore((s) => s.observer);
  const passes = useSatelliteStore((s) => s.passes);
  const setPasses = useSatelliteStore((s) => s.setPasses);
  const sidebarWidth = useSatelliteStore((s) => s.sidebarWidth);
  const setSidebarWidth = useSatelliteStore((s) => s.setSidebarWidth);

  const isMobilePanelOpen = useSatelliteStore((s) => s.isMobilePanelOpen);
  const setMobilePanelOpen = useSatelliteStore((s) => s.setMobilePanelOpen);

  // Ticking clock — 10s during live passes for real-time elevation, 60s otherwise
  const [now, setNow] = useState(() => new Date());
  const hasLivePass = useMemo(() => {
    const t = now.getTime();
    return passes.some((p) => p.startTime.getTime() <= t && p.endTime.getTime() > t);
  }, [passes, now]);

  useEffect(() => {
    const interval = hasLivePass ? 10_000 : 60_000;
    const id = setInterval(() => setNow(new Date()), interval);
    return () => clearInterval(id);
  }, [hasLivePass]);

  const [detailSatId, setDetailSatId] = useState<number | null>(null);
  const [computingPasses, setComputingPasses] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  const sidebarRef = useRef<HTMLElement>(null);

  // Sync store sidebar width → DOM (desktop only)
  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => {
      el.style.width = mq.matches ? sidebarWidth + 'px' : '';
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [sidebarWidth]);

  // Sidebar drag-resize handler — direct DOM manipulation for smooth dragging
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const el = sidebarRef.current;
    if (!el) return;
    const startWidth = el.getBoundingClientRect().width;

    const handleMouseMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX;
      const newWidth = Math.max(240, Math.min(600, startWidth + delta));
      el.style.width = newWidth + 'px';
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      const finalWidth = el.getBoundingClientRect().width;
      setSidebarWidth(finalWidth);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [setSidebarWidth]);

  // Merge normal + mass satellites for display
  const allSatellites = useMemo(() => {
    return [...satellites, ...massSatellites];
  }, [satellites, massSatellites]);

  // Combined positions lookup
  const getPosition = useCallback(
    (id: number): SatellitePosition | undefined => {
      return positions.get(id) ?? massPositions.get(id);
    },
    [positions, massPositions],
  );

  // Map from NORAD ID to TLE for Doppler + live elevation
  const tleMap = useMemo(() => {
    const map = new Map<number, { name: string; line1: string; line2: string }>();
    for (const sat of allSatellites) {
      map.set(sat.id, sat.tle);
    }
    return map;
  }, [allSatellites]);

  // Measure list container height
  useEffect(() => {
    const container = listContainerRef.current;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      setListHeight(entries[0].contentRect.height);
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Compute passes when observer or satellites change (only normal satellites, not mass)
  useEffect(() => {
    if (!observer || satellites.length === 0) {
      setPasses([]);
      return;
    }

    setComputingPasses(true);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Exclude mass satellites from pass computation (too expensive)
    const satData = satellites.map((s) => ({ id: s.id, name: s.name, tle: s.tle }));

    timerRef.current = setTimeout(() => {
      try {
        const result = findPasses(satData, observer, 24);
        setPasses(result);
      } catch {
        setPasses([]);
      }
      setComputingPasses(false);
    }, 100);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [observer, satellites, setPasses]);

  // Sort passes: receivable satellites first, then by peak elevation (highest first)
  const sortedPasses = useMemo(() => {
    return [...passes].sort((a, b) => {
      const aReceivable = isReceivable(a.satId) ? 1 : 0;
      const bReceivable = isReceivable(b.satId) ? 1 : 0;
      if (aReceivable !== bReceivable) return bReceivable - aReceivable;
      return b.peakElevation - a.peakElevation;
    });
  }, [passes]);

  // Always show all passes — highlight the selected satellite instead of filtering
  const visiblePasses = sortedPasses;

  // Best pass: highest elevation among receivable (active/intermittent) satellites
  const bestPassKey = useMemo(() => {
    let bestEl = -1;
    let bestKey = '';
    for (const p of passes) {
      if (isReceivable(p.satId) && p.peakElevation > bestEl) {
        bestEl = p.peakElevation;
        bestKey = `${p.satId}-${p.startTime.getTime()}`;
      }
    }
    return bestKey;
  }, [passes]);

  // Doppler computation for visible passes (memoized)
  const dopplerMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!observer) return map;
    for (const pass of visiblePasses.slice(0, 20)) {
      const profile = getRadioProfile(pass.satId);
      if (!profile || profile.downlinks.length === 0) continue;
      if (profile.status !== 'active' && profile.status !== 'intermittent') continue;
      const tle = tleMap.get(pass.satId);
      if (!tle) continue;
      const freq = profile.downlinks[0].frequencyHz;
      const key = `${pass.satId}-${pass.startTime.getTime()}`;
      const doppler = computeMaxDoppler(
        tle,
        observer,
        pass.startTime.getTime(),
        pass.endTime.getTime(),
        freq,
      );
      map.set(key, doppler);
    }
    return map;
  }, [visiblePasses, observer, tleMap]);

  // Virtual scrolling calculations
  const totalItems = allSatellites.length;
  const totalHeight = totalItems * ITEM_HEIGHT;
  const useVirtualScroll = totalItems > 100;

  const startIndex = useVirtualScroll
    ? Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN)
    : 0;
  const endIndex = useVirtualScroll
    ? Math.min(totalItems, Math.ceil((scrollTop + listHeight) / ITEM_HEIGHT) + OVERSCAN)
    : totalItems;
  const visibleSatellites = allSatellites.slice(startIndex, endIndex);

  const detailPos = detailSatId !== null ? getPosition(detailSatId) : undefined;
  const detailSat = detailSatId !== null ? allSatellites.find((s) => s.id === detailSatId) : null;

  // Find the next pass for the detail satellite (for SatDump export)
  const detailPass: SatellitePass | undefined = useMemo(() => {
    if (detailSatId === null) return undefined;
    return passes.find((p) => p.satId === detailSatId);
  }, [detailSatId, passes]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Check if satellite name should be dimmed (inactive radio status)
  const isInactive = useCallback((noradId: number): boolean => {
    const p = getRadioProfile(noradId);
    return p?.status === 'inactive';
  }, []);

  const mobileTab = useSatelliteStore((s) => s.mobileTab);
  const setMobileTab = useSatelliteStore((s) => s.setMobileTab);

  // --- Shared sub-components ---

  const satelliteListContent = (
    <div
      ref={listContainerRef}
      className="flex-1 overflow-y-auto px-4"
      onScroll={handleScroll}
    >
      <div
        style={useVirtualScroll ? { height: totalHeight, position: 'relative' } : undefined}
      >
        {visibleSatellites.map((sat, i) => {
          const pos = getPosition(sat.id);
          const isSelected = sat.id === selectedSatId;
          const groupColor = GROUP_COLORS[sat.group as SatelliteGroup] || '#00d4ff';
          const itemIndex = startIndex + i;
          const inactive = isInactive(sat.id);

          return (
            <div
              key={sat.id}
              style={
                useVirtualScroll
                  ? {
                      position: 'absolute',
                      top: itemIndex * ITEM_HEIGHT,
                      left: 0,
                      right: 0,
                      height: ITEM_HEIGHT,
                    }
                  : undefined
              }
            >
              <div
                className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors flex items-center gap-1 cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500/15 border border-cyan-500/30'
                    : 'hover:bg-gray-800 border border-transparent'
                }`}
                onClick={() => {
                  selectSatellite(isSelected ? null : sat.id);
                  setMobilePanelOpen(false);
                }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: groupColor }}
                />
                <span
                  className={`font-medium truncate flex-1 ${
                    inactive
                      ? 'text-gray-500 opacity-60'
                      : isSelected
                        ? 'text-cyan-300'
                        : 'text-gray-200'
                  }`}
                >
                  {sat.name}
                </span>
                <RadioBadge noradId={sat.id} group={sat.group} />
                {pos && (
                  <span className="text-gray-500 text-xs shrink-0">
                    {pos.alt.toFixed(0)} km
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDetailSatId(detailSatId === sat.id ? null : sat.id);
                  }}
                  className="ml-1 w-5 h-5 rounded flex items-center justify-center text-gray-500 hover:text-white hover:bg-gray-700 transition-colors shrink-0"
                  title="Show details"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="w-3.5 h-3.5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const passesContent = (
    <div className="flex-1 overflow-y-auto px-4">
      {!observer ? (
        <p className="text-xs text-gray-500 py-4">Click on the globe to set observer location</p>
      ) : computingPasses ? (
        <p className="text-xs text-yellow-400 py-4">Computing passes...</p>
      ) : visiblePasses.length > 0 ? (
        <>
          <div className="flex items-center justify-between py-2">
            <h4 className="text-xs text-gray-500 uppercase tracking-wider">
              Passes (24h) &middot; {visiblePasses.length}
            </h4>
            <span className="text-xs text-gray-400 font-mono">
              {observer.lat.toFixed(2)}&deg;, {observer.lng.toFixed(2)}&deg;
            </span>
          </div>
          <ul className="space-y-2 pb-4">
            {visiblePasses.slice(0, 20).map((pass, i) => {
              const passKey = `${pass.satId}-${pass.startTime.getTime()}`;
              const isBest = passKey === bestPassKey;
              const doppler = dopplerMap.get(passKey);
              const profile = getRadioProfile(pass.satId);
              const inactive = profile?.status === 'inactive';
              const isSelected = selectedSatId === pass.satId;
              const isWeak = pass.peakElevation < 10;

              return (
                <li
                  key={`${pass.satId}-${i}`}
                  className={`text-xs rounded px-2 py-2 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-cyan-500/15 ring-1 ring-cyan-400/40'
                      : isBest
                        ? 'bg-amber-500/10 ring-1 ring-amber-400/40 hover:bg-amber-500/15'
                        : isWeak
                          ? 'bg-gray-800/30 opacity-50 hover:opacity-80 hover:bg-gray-800/50'
                          : 'bg-gray-800/50 hover:bg-gray-800'
                  }`}
                  onClick={() => {
                    selectSatellite(isSelected ? null : pass.satId);
                  }}
                >
                  <div className="flex justify-between items-center gap-1">
                    <div className="flex items-center gap-1 min-w-0">
                      {isBest && (
                        <span className="shrink-0" title="Best pass">
                          &#11088;
                        </span>
                      )}
                      <span
                        className={`font-medium truncate ${inactive ? 'text-gray-500 opacity-60' : 'text-gray-200'}`}
                      >
                        {pass.satName}
                      </span>
                      <RadioBadge noradId={pass.satId} />
                    </div>
                    <span className={`font-mono shrink-0 ${
                      pass.peakElevation >= 45 ? 'text-green-400' :
                      pass.peakElevation >= 20 ? 'text-green-400/70' :
                      pass.peakElevation >= 10 ? 'text-yellow-400/70' :
                      'text-gray-500'
                    }`}>
                      {pass.peakElevation.toFixed(0)}&deg;
                    </span>
                  </div>
                  <div className="text-gray-500 mt-0.5 flex items-center justify-between">
                    <span>
                      {formatTime(pass.startTime)} &ndash; {formatTime(pass.endTime)}
                      <span className="ml-2">
                        ({formatDuration(pass.startTime, pass.endTime)})
                      </span>
                    </span>
                    {doppler !== undefined && doppler > 0 && (
                      <span className="text-gray-600 font-mono" title="Max Doppler shift">
                        &plusmn;{(doppler / 1000).toFixed(1)} kHz
                      </span>
                    )}
                  </div>
                  {(() => {
                    const cd = formatCountdown(now, pass);
                    if (cd.urgency === 'past') return null;
                    const styles = {
                      live: 'bg-green-500/20 text-green-400 border border-green-500/30 shadow-[0_0_6px_rgba(34,197,94,0.25)]',
                      soon: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
                      normal: 'bg-cyan-500/10 text-cyan-400/80 border border-cyan-500/20',
                      past: 'text-gray-600',
                    };
                    return (
                      <span
                        className={`inline-block text-[10px] font-mono mt-0.5 px-1.5 py-0.5 rounded-full ${styles[cd.urgency]}`}
                      >
                        {cd.isLive ? formatLiveLabel(now, pass, cd.text, tleMap.get(pass.satId), observer) : cd.text}
                      </span>
                    );
                  })()}
                  {isBest && (
                    <div className="text-[10px] text-amber-400/70 mt-0.5">Best pass</div>
                  )}
                  {profile && !inactive && (
                    <div className="mt-1.5 pt-1.5 border-t border-gray-700/50 space-y-0.5">
                      {profile.downlinks.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className="text-gray-500">Freq:</span>
                          <span className="text-green-400 font-mono">
                            {profile.downlinks.map((d) =>
                              d.frequencyHz >= 1e9
                                ? `${(d.frequencyHz / 1e9).toFixed(3)} GHz`
                                : `${(d.frequencyHz / 1e6).toFixed(3)} MHz`
                            ).join(', ')}
                          </span>
                        </div>
                      )}
                      <div className="flex items-start gap-1.5 text-[10px]">
                        <span className="text-gray-500 shrink-0">Ant:</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailSatId(detailSatId === pass.satId ? null : pass.satId);
                          }}
                          className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 decoration-cyan-400/30 text-left"
                        >
                          {profile.antenna}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="text-xs text-gray-500 py-4">No passes in next 24h</p>
      )}
    </div>
  );

  const detailPopup = detailSat && (
    <div className="absolute inset-x-4 top-16 md:top-16 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4 z-50 max-h-[60vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{detailSat.name}</h3>
          <RadioBadge noradId={detailSat.id} group={detailSat.group} />
        </div>
        <button
          onClick={() => setDetailSatId(null)}
          className="text-gray-400 hover:text-white text-lg leading-none shrink-0 ml-2"
        >
          &times;
        </button>
      </div>
      {detailPos && (
        <dl className="space-y-2 text-xs">
          <div className="flex justify-between">
            <dt className="text-gray-400">Latitude</dt>
            <dd className="text-white font-mono">{detailPos.lat.toFixed(4)}&deg;</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-400">Longitude</dt>
            <dd className="text-white font-mono">{detailPos.lng.toFixed(4)}&deg;</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-400">Altitude</dt>
            <dd className="text-white font-mono">{detailPos.alt.toFixed(1)} km</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-400">Velocity</dt>
            <dd className="text-white font-mono">{detailPos.velocity.toFixed(2)} km/s</dd>
          </div>
        </dl>
      )}

      {/* Radio section */}
      <RadioDetail
        noradId={detailSat.id}
        satName={detailSat.name}
        group={detailSat.group}
        observer={observer}
        pass={detailPass}
      />
    </div>
  );

  return (
    <>
      {/* Desktop: resize handle between globe and sidebar */}
      <div
        onMouseDown={handleResizeStart}
        className="hidden md:flex shrink-0 w-3 cursor-col-resize items-center justify-center bg-gray-800 hover:bg-gray-700 active:bg-cyan-900 transition-colors border-x border-gray-700"
      >
        <div className="flex flex-col gap-1">
          <div className={`w-1 h-1 rounded-full ${isResizing ? 'bg-cyan-400' : 'bg-gray-500'}`} />
          <div className={`w-1 h-1 rounded-full ${isResizing ? 'bg-cyan-400' : 'bg-gray-500'}`} />
          <div className={`w-1 h-1 rounded-full ${isResizing ? 'bg-cyan-400' : 'bg-gray-500'}`} />
        </div>
      </div>

      <aside
        ref={sidebarRef}
        id="sat-sidebar"
        className={`
          fixed inset-x-0 bottom-0 z-30 h-[55vh] rounded-t-2xl
          transform transition-transform duration-300 ease-in-out
          ${isMobilePanelOpen ? 'translate-y-0' : 'translate-y-full'}
          md:relative md:transform-none md:translate-y-0 md:h-auto md:rounded-none md:z-auto
          md:w-80 shrink-0 bg-gray-900 border-l border-gray-800 overflow-hidden flex flex-col
        `}
      >
      {/* Mobile: drag handle + tabs */}
      <div className="md:hidden shrink-0">
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-600" />
        </div>
        <div className="flex items-center px-2 pb-1">
          <div className="flex flex-1 bg-gray-800 rounded-lg p-0.5">
            <button
              onClick={() => setMobileTab('passes')}
              className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors ${
                mobileTab === 'passes'
                  ? 'bg-gray-700 text-white shadow-sm'
                  : 'text-gray-400 active:text-gray-200'
              }`}
            >
              Passes{visiblePasses.length > 0 ? ` (${visiblePasses.length})` : ''}
            </button>
            <button
              onClick={() => setMobileTab('satellites')}
              className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors ${
                mobileTab === 'satellites'
                  ? 'bg-gray-700 text-white shadow-sm'
                  : 'text-gray-400 active:text-gray-200'
              }`}
            >
              Satellites ({allSatellites.length})
            </button>
          </div>
          <button
            onClick={() => setMobilePanelOpen(false)}
            className="ml-2 w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-400"
          >
            &times;
          </button>
        </div>
      </div>

      {/* Mobile: tab content */}
      <div className="md:hidden flex-1 overflow-hidden flex flex-col">
        {mobileTab === 'passes' ? passesContent : satelliteListContent}
      </div>

      {/* Desktop: original layout — satellite list header + list + passes */}
      <div className="hidden md:flex md:flex-col md:flex-1 md:overflow-hidden">
        <div className="p-4 pb-2 shrink-0">
          <h2 className="text-lg font-semibold text-white">
            Satellites ({allSatellites.length})
          </h2>
          {massSatellites.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              incl. {massSatellites.length} Starlink (no orbits/beams)
            </p>
          )}
        </div>

        {satelliteListContent}

        {/* Observer & passes section */}
        {observer && (
          <div className="border-t border-gray-800 p-4 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-orange-400">Observer</h3>
              <span className="text-xs text-gray-400 font-mono">
                {observer.lat.toFixed(2)}&deg;, {observer.lng.toFixed(2)}&deg;
              </span>
            </div>

            {computingPasses ? (
              <p className="text-xs text-yellow-400">Computing passes...</p>
            ) : visiblePasses.length > 0 ? (
              <div>
                <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                  Passes (24h) &middot; {visiblePasses.length}
                </h4>
                <ul className="space-y-2 max-h-[40vh] overflow-y-auto">
                  {visiblePasses.slice(0, 20).map((pass, i) => {
                    const passKey = `${pass.satId}-${pass.startTime.getTime()}`;
                    const isBest = passKey === bestPassKey;
                    const doppler = dopplerMap.get(passKey);
                    const profile = getRadioProfile(pass.satId);
                    const inactive = profile?.status === 'inactive';
                    const isSelected = selectedSatId === pass.satId;
                    const isWeak = pass.peakElevation < 10;

                    return (
                      <li
                        key={`${pass.satId}-${i}`}
                        className={`text-xs rounded px-2 py-1.5 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-cyan-500/15 ring-1 ring-cyan-400/40'
                            : isBest
                              ? 'bg-amber-500/10 ring-1 ring-amber-400/40 hover:bg-amber-500/15'
                              : isWeak
                                ? 'bg-gray-800/30 opacity-50 hover:opacity-80 hover:bg-gray-800/50'
                                : 'bg-gray-800/50 hover:bg-gray-800'
                        }`}
                        onClick={() => {
                          selectSatellite(isSelected ? null : pass.satId);
                        }}
                      >
                        <div className="flex justify-between items-center gap-1">
                          <div className="flex items-center gap-1 min-w-0">
                            {isBest && (
                              <span className="shrink-0" title="Best pass">
                                &#11088;
                              </span>
                            )}
                            <span
                              className={`font-medium truncate ${inactive ? 'text-gray-500 opacity-60' : 'text-gray-200'}`}
                            >
                              {pass.satName}
                            </span>
                            <RadioBadge noradId={pass.satId} />
                          </div>
                          <span className={`font-mono shrink-0 ${
                            pass.peakElevation >= 45 ? 'text-green-400' :
                            pass.peakElevation >= 20 ? 'text-green-400/70' :
                            pass.peakElevation >= 10 ? 'text-yellow-400/70' :
                            'text-gray-500'
                          }`}>
                            {pass.peakElevation.toFixed(0)}&deg;
                          </span>
                        </div>
                        <div className="text-gray-500 mt-0.5 flex items-center gap-1 flex-wrap">
                          <span className="shrink-0">
                            {formatTime(pass.startTime)}&ndash;{formatTime(pass.endTime)}
                          </span>
                          <span className="shrink-0">
                            ({formatDuration(pass.startTime, pass.endTime)})
                          </span>
                          {doppler !== undefined && doppler > 0 && (
                            <span className="text-gray-600 font-mono shrink-0" title="Max Doppler shift">
                              &plusmn;{(doppler / 1000).toFixed(1)}kHz
                            </span>
                          )}
                        </div>
                        {(() => {
                          const cd = formatCountdown(now, pass);
                          if (cd.urgency === 'past') return null;
                          const styles = {
                            live: 'bg-green-500/20 text-green-400 border border-green-500/30 shadow-[0_0_6px_rgba(34,197,94,0.25)]',
                            soon: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
                            normal: 'bg-cyan-500/10 text-cyan-400/80 border border-cyan-500/20',
                            past: 'text-gray-600',
                          };
                          return (
                            <span
                              className={`inline-block text-[10px] font-mono mt-0.5 px-1.5 py-0.5 rounded-full ${styles[cd.urgency]}`}
                            >
                              {cd.isLive ? formatLiveLabel(now, pass, cd.text, tleMap.get(pass.satId), observer) : cd.text}
                            </span>
                          );
                        })()}
                        {isBest && (
                          <div className="text-[10px] text-amber-400/70 mt-0.5">Best pass</div>
                        )}
                        {profile && !inactive && (
                          <div className="mt-1.5 pt-1.5 border-t border-gray-700/50 space-y-0.5">
                            {profile.downlinks.length > 0 && (
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-gray-500">Freq:</span>
                                <span className="text-green-400 font-mono">
                                  {profile.downlinks.map((d) =>
                                    d.frequencyHz >= 1e9
                                      ? `${(d.frequencyHz / 1e9).toFixed(3)} GHz`
                                      : `${(d.frequencyHz / 1e6).toFixed(3)} MHz`
                                  ).join(', ')}
                                </span>
                              </div>
                            )}
                            <div className="flex items-start gap-1.5 text-[10px] min-w-0">
                              <span className="text-gray-500 shrink-0">Ant:</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailSatId(detailSatId === pass.satId ? null : pass.satId);
                                }}
                                className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 decoration-cyan-400/30 text-left truncate"
                              >
                                {profile.antenna}
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-gray-500">No passes in next 24h</p>
            )}
          </div>
        )}

        {!observer && (
          <div className="border-t border-gray-800 p-4 shrink-0">
            <p className="text-xs text-gray-500">Click on the globe to set observer location</p>
          </div>
        )}
      </div>

      {detailPopup}
    </aside>
    </>
  );
}
