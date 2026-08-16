'use client';

import { useEffect, useState, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { useToastStore } from '@/store/useToastStore';
import { findPasses, getCurrentElevation } from '@/lib/passes';
import type { SatellitePass } from '@/lib/passes';
import { GROUP_COLORS, GROUP_LABELS } from '@/lib/constants';
import type { SatelliteGroup } from '@/lib/constants';
import type { Satellite, SatellitePosition } from '@/types/satellite';
import { CountryFlag } from '@/components/CountryFlag';
import { RadioBadge } from '@/components/radio/RadioBadge';
import { PassListItem } from '@/components/PassListItem';
import { PassDetail } from '@/components/PassDetail';
import { SatelliteDetail } from '@/components/SatelliteDetail';
import { computePassVisibility } from '@/lib/visibility';
import type { PassVisibility } from '@/lib/visibility';
import {
  getRadioProfile,
  isReceivable,
} from '@/lib/radio/radioProfiles';
import { computeMaxDoppler } from '@/lib/radio/doppler';

const ITEM_HEIGHT = 36; // px per satellite row
const HEADER_HEIGHT = 30; // px per group header row
const OVERSCAN = 10;
// Safety cap: selecting a whole mega-constellation at once would stall rendering
const MAX_GROUP_SELECT = 200;

type ListRow =
  | { kind: 'header'; group: string; ids: number[]; top: number; height: number }
  | { kind: 'sat'; sat: Satellite; top: number; height: number };

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
  const selectedSatIds = useSatelliteStore((s) => s.selectedSatIds);
  const selectSatellite = useSatelliteStore((s) => s.selectSatellite);
  const selectSatellites = useSatelliteStore((s) => s.selectSatellites);
  const deselectSatellites = useSatelliteStore((s) => s.deselectSatellites);
  const addToast = useToastStore((s) => s.addToast);
  const observer = useSatelliteStore((s) => s.observer);
  const passes = useSatelliteStore((s) => s.passes);
  const setPasses = useSatelliteStore((s) => s.setPasses);
  const sidebarWidth = useSatelliteStore((s) => s.sidebarWidth);
  const setSidebarWidth = useSatelliteStore((s) => s.setSidebarWidth);

  const isMobilePanelOpen = useSatelliteStore((s) => s.isMobilePanelOpen);
  const setMobilePanelOpen = useSatelliteStore((s) => s.setMobilePanelOpen);
  const isSidebarCollapsed = useSatelliteStore((s) => s.isSidebarCollapsed);
  const toggleSidebarCollapsed = useSatelliteStore((s) => s.toggleSidebarCollapsed);
  const satnogsInfo = useSatelliteStore((s) => s.satnogsInfo);
  const satnogsTransmitters = useSatelliteStore((s) => s.satnogsTransmitters);
  const collectionSatIds = useSatelliteStore((s) => s.collectionSatIds);
  const addToCollection = useSatelliteStore((s) => s.addToCollection);
  const removeFromCollection = useSatelliteStore((s) => s.removeFromCollection);
  const statusFilter = useSatelliteStore((s) => s.statusFilter);
  const setObserverPickerOpen = useSatelliteStore((s) => s.setObserverPickerOpen);

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
  const [detailPassKey, setDetailPassKey] = useState<string | null>(null);
  const [visibleOnly, setVisibleOnly] = useState(false);
  const [computingPasses, setComputingPasses] = useState(false);
  const [collectionCollapsed, setCollectionCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const [scrollTop, setScrollTop] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const virtualRef = useRef<HTMLDivElement>(null);
  const [virtualOffset, setVirtualOffset] = useState(0);
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

  // Merge normal + mass satellites for display, filtered by status
  const allSatellites = useMemo(() => {
    const merged = [...satellites, ...massSatellites];
    if (statusFilter === 'all') return merged;
    return merged.filter((s) => {
      const info = satnogsInfo.get(s.id);
      const isDead = info?.status === 'dead' || info?.status === 're-entered';
      return statusFilter === 'dead' ? isDead : !isDead;
    });
  }, [satellites, massSatellites, statusFilter, satnogsInfo]);

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

  // Naked-eye visibility for the passes that actually get rendered
  const passKey = useCallback(
    (p: SatellitePass) => `${p.satId}-${p.startTime.getTime()}`,
    [],
  );

  const visibilityMap = useMemo(() => {
    const map = new Map<string, PassVisibility>();
    if (!observer) return map;
    for (const pass of sortedPasses.slice(0, 40)) {
      const tle = tleMap.get(pass.satId);
      if (!tle) continue;
      map.set(passKey(pass), computePassVisibility(tle, observer, pass.startTime, pass.endTime));
    }
    return map;
  }, [sortedPasses, observer, tleMap, passKey]);

  // Always show all passes — highlight the selected satellite instead of filtering
  const visiblePasses = useMemo(
    () => (visibleOnly ? sortedPasses.filter((p) => visibilityMap.get(passKey(p))?.visible) : sortedPasses),
    [visibleOnly, sortedPasses, visibilityMap, passKey],
  );

  const visibleCount = useMemo(
    () => sortedPasses.reduce((n, p) => (visibilityMap.get(passKey(p))?.visible ? n + 1 : n), 0),
    [sortedPasses, visibilityMap, passKey],
  );

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

  const selectedSet = useMemo(() => new Set(selectedSatIds), [selectedSatIds]);

  // Group satellites into collapsible sections and flatten to positioned rows
  const { rows, totalHeight } = useMemo(() => {
    const byGroup = new Map<string, Satellite[]>();
    for (const sat of allSatellites) {
      const bucket = byGroup.get(sat.group);
      if (bucket) bucket.push(sat);
      else byGroup.set(sat.group, [sat]);
    }

    const out: ListRow[] = [];
    let top = 0;
    for (const [group, sats] of byGroup) {
      out.push({
        kind: 'header',
        group,
        ids: sats.map((s) => s.id),
        top,
        height: HEADER_HEIGHT,
      });
      top += HEADER_HEIGHT;
      if (collapsedGroups.has(group)) continue;
      for (const sat of sats) {
        out.push({ kind: 'sat', sat, top, height: ITEM_HEIGHT });
        top += ITEM_HEIGHT;
      }
    }
    return { rows: out, totalHeight: top };
  }, [allSatellites, collapsedGroups]);

  const useVirtualScroll = rows.length > 100;

  // The virtualized block may be pushed down by the collection section — measure the offset
  useLayoutEffect(() => {
    const el = virtualRef.current;
    const container = listContainerRef.current;
    if (!el || !container) return;
    const offset =
      el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
    setVirtualOffset(offset);
  }, [collectionSatIds.length, collectionCollapsed, rows.length]);

  // Virtual window over rows (mixed heights → binary search on row tops)
  const [startIndex, endIndex] = useMemo(() => {
    if (!useVirtualScroll) return [0, rows.length];
    const viewTop = scrollTop - virtualOffset;
    const viewBottom = viewTop + listHeight;

    let lo = 0;
    let hi = rows.length - 1;
    let first = rows.length;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (rows[mid].top + rows[mid].height > viewTop) {
        first = mid;
        hi = mid - 1;
      } else {
        lo = mid + 1;
      }
    }
    let last = first;
    while (last < rows.length && rows[last].top < viewBottom) last++;

    return [Math.max(0, first - OVERSCAN), Math.min(rows.length, last + OVERSCAN)];
  }, [useVirtualScroll, rows, scrollTop, listHeight, virtualOffset]);

  const visibleRows = rows.slice(startIndex, endIndex);

  const toggleGroupCollapsed = useCallback((group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }, []);

  // Select / deselect an entire group in one click
  const toggleGroupSelection = useCallback(
    (group: string, ids: number[]) => {
      const missing = ids.filter((id) => !selectedSet.has(id));
      if (missing.length === 0) {
        deselectSatellites(ids);
        return;
      }
      const label = GROUP_LABELS[group as SatelliteGroup] || group;
      if (missing.length > MAX_GROUP_SELECT) {
        selectSatellites(missing.slice(0, MAX_GROUP_SELECT));
        addToast(
          `${label}: selected first ${MAX_GROUP_SELECT} of ${missing.length} satellites`,
          'info',
        );
      } else {
        selectSatellites(missing);
      }
    },
    [selectedSet, selectSatellites, deselectSatellites, addToast],
  );

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

  // Collection satellites from allSatellites
  const collectionSats = useMemo(() => {
    if (collectionSatIds.length === 0) return [];
    const idSet = new Set(collectionSatIds);
    return allSatellites.filter((s) => idSet.has(s.id));
  }, [allSatellites, collectionSatIds]);

  // --- Shared sub-components ---

  const satelliteListContent = (
    <div
      ref={listContainerRef}
      className="flex-1 overflow-y-auto px-4"
      onScroll={handleScroll}
    >
      {/* My Collection section */}
      {collectionSatIds.length > 0 && (
        <div className="mb-2">
          <button
            onClick={() => setCollectionCollapsed(!collectionCollapsed)}
            className="w-full flex items-center gap-1.5 py-1.5 text-left"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-3 h-3 text-gray-500 transition-transform ${collectionCollapsed ? '' : 'rotate-90'}`}>
              <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
            <span className="text-yellow-400 text-xs">&#9733;</span>
            <span className="text-xs font-medium text-gray-300">My Collection</span>
            <span className="text-[10px] text-gray-500">({collectionSatIds.length})</span>
          </button>
          {!collectionCollapsed && (
            <div className="space-y-0.5">
              {collectionSats.map((sat) => {
                const pos = getPosition(sat.id);
                const isSelected = selectedSatIds.includes(sat.id);
                const groupColor = sat.group === 'collection' ? '#ffd700' : (GROUP_COLORS[sat.group as SatelliteGroup] || '#ffd700');

                return (
                  <div
                    key={sat.id}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/15 border border-cyan-500/30'
                        : 'hover:bg-gray-800 border border-transparent'
                    }`}
                    onClick={() => {
                      selectSatellite(sat.id);
                      setMobilePanelOpen(false);
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: groupColor }}
                    />
                    <CountryFlag group={sat.group} />
                    <span
                      className={`font-medium truncate flex-1 ${
                        isSelected ? 'text-cyan-300' : 'text-gray-200'
                      }`}
                    >
                      {sat.name}
                    </span>
                    {pos && (
                      <span className="text-gray-500 text-xs shrink-0">
                        {pos.alt.toFixed(0)} km
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromCollection(sat.id);
                      }}
                      className="w-5 h-5 rounded flex items-center justify-center text-yellow-400 hover:text-red-400 text-sm leading-none transition-colors shrink-0"
                      title="Remove from collection"
                    >
                      &#9733;
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div
        ref={virtualRef}
        style={useVirtualScroll ? { height: totalHeight, position: 'relative' } : undefined}
      >
        {visibleRows.map((row) => {
          const rowStyle = useVirtualScroll
            ? ({
                position: 'absolute' as const,
                top: row.top,
                left: 0,
                right: 0,
                height: row.height,
              })
            : undefined;

          if (row.kind === 'header') {
            const collapsed = collapsedGroups.has(row.group);
            const selectedCount = row.ids.reduce((n, id) => (selectedSet.has(id) ? n + 1 : n), 0);
            const allSelected = selectedCount === row.ids.length;
            const someSelected = selectedCount > 0 && !allSelected;
            const groupColor = GROUP_COLORS[row.group as SatelliteGroup] || '#00d4ff';

            return (
              <div
                key={`group-${row.group}`}
                style={rowStyle}
                className="flex items-center gap-1.5 h-[30px]"
              >
                <button
                  onClick={() => toggleGroupSelection(row.group, row.ids)}
                  title={
                    allSelected
                      ? `Deselect all (${row.ids.length})`
                      : `Select all (${row.ids.length})`
                  }
                  className={`w-4 h-4 shrink-0 rounded-[3px] border flex items-center justify-center text-[9px] leading-none transition-colors ${
                    allSelected
                      ? 'bg-cyan-500 border-cyan-400 text-gray-900'
                      : someSelected
                        ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                        : 'border-gray-600 text-transparent hover:border-cyan-500/60'
                  }`}
                >
                  {allSelected ? '✓' : someSelected ? '−' : ''}
                </button>
                <button
                  onClick={() => toggleGroupCollapsed(row.group)}
                  className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-3 h-3 shrink-0 text-gray-500 transition-transform ${collapsed ? '' : 'rotate-90'}`}>
                    <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: groupColor }} />
                  <CountryFlag group={row.group} />
                  <span className="text-xs font-medium text-gray-300 truncate">
                    {GROUP_LABELS[row.group as SatelliteGroup] || row.group}
                  </span>
                  <span className="text-[10px] text-gray-500 shrink-0">
                    {selectedCount > 0 ? `${selectedCount}/${row.ids.length}` : `(${row.ids.length})`}
                  </span>
                </button>
              </div>
            );
          }

          const sat = row.sat;
          const pos = getPosition(sat.id);
          const isSelected = selectedSet.has(sat.id);
          const info = satnogsInfo.get(sat.id);
          const isDead = info?.status === 'dead' || info?.status === 're-entered';
          const groupColor = isDead ? '#555555' : (GROUP_COLORS[sat.group as SatelliteGroup] || '#00d4ff');
          const inactive = isInactive(sat.id);

          return (
            <div key={sat.id} style={rowStyle}>
              <div
                className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors flex items-center gap-1 cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500/15 border border-cyan-500/30'
                    : 'hover:bg-gray-800 border border-transparent'
                }`}
                onClick={() => {
                  selectSatellite(sat.id);
                  setMobilePanelOpen(false);
                }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: groupColor }}
                />
                <CountryFlag group={sat.group} />
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
                {isDead && (
                  <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-gray-700 text-gray-400 shrink-0">
                    {info?.status === 're-entered' ? 'RE' : 'DEAD'}
                  </span>
                )}
                <RadioBadge noradId={sat.id} group={sat.group} />
                {pos && (
                  <span className="text-gray-500 text-xs shrink-0">
                    {pos.alt.toFixed(0)} km
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (collectionSatIds.includes(sat.id)) {
                      removeFromCollection(sat.id);
                    } else {
                      addToCollection(sat);
                    }
                  }}
                  className={`w-5 h-5 rounded flex items-center justify-center text-sm leading-none transition-colors shrink-0 ${
                    collectionSatIds.includes(sat.id) ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-600 hover:text-yellow-400'
                  }`}
                  title={collectionSatIds.includes(sat.id) ? 'Remove from collection' : 'Add to collection'}
                >
                  {collectionSatIds.includes(sat.id) ? '\u2605' : '\u2606'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDetailSatId(detailSatId === sat.id ? null : sat.id);
                  }}
                  className="w-5 h-5 rounded flex items-center justify-center text-gray-500 hover:text-white hover:bg-gray-700 transition-colors shrink-0"
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
        <div className="py-4 space-y-2">
          <p className="text-xs text-gray-500">
            Set your location to see which satellites pass over you, when, and where to point.
          </p>
          <button
            onClick={() => setObserverPickerOpen(true)}
            className="px-2.5 py-1.5 rounded text-xs font-medium bg-orange-500/15 text-orange-300 border border-orange-500/30 hover:bg-orange-500/25 transition-colors"
          >
            Set my location
          </button>
        </div>
      ) : computingPasses ? (
        <p className="text-xs text-yellow-400 py-4">Computing passes...</p>
      ) : visiblePasses.length > 0 ? (
        <>
          <div className="flex items-center justify-between py-2 gap-2">
            <h4 className="text-xs text-gray-500 uppercase tracking-wider">
              Passes (24h) &middot; {visiblePasses.length}
            </h4>
            <button
              onClick={() => setVisibleOnly(!visibleOnly)}
              className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                visibleOnly
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-gray-800 text-gray-500 border-gray-700 hover:text-gray-300'
              }`}
              title="Only passes you can actually see with the naked eye"
            >
              &#128065; Visible {visibleCount > 0 ? `(${visibleCount})` : ''}
            </button>
          </div>
          <ul className="space-y-2 pb-4">
            {visiblePasses.slice(0, 20).map((pass, i) => (
              <PassListItem
                key={`${pass.satId}-${i}`}
                pass={pass} index={i}
                isBest={`${pass.satId}-${pass.startTime.getTime()}` === bestPassKey}
                doppler={dopplerMap.get(`${pass.satId}-${pass.startTime.getTime()}`)}
                profile={getRadioProfile(pass.satId)}
                isSelected={selectedSatIds.includes(pass.satId)}
                now={now} observer={observer}
                tleData={tleMap.get(pass.satId)}
                detailSatId={detailSatId} setDetailSatId={setDetailSatId}
                selectSatellite={selectSatellite}
                formatTime={formatTime} formatDuration={formatDuration}
                formatCountdown={formatCountdown} formatLiveLabel={formatLiveLabel}
                visibility={visibilityMap.get(passKey(pass))}
                onOpenDetail={(p) => setDetailPassKey(passKey(p))}
              />
            ))}
          </ul>
        </>
      ) : (
        <p className="text-xs text-gray-500 py-4">No passes in next 24h</p>
      )}
    </div>
  );

  const detailPopup = detailSat && (
    <SatelliteDetail
      sat={detailSat}
      position={detailPos}
      satnogsInfo={satnogsInfo.get(detailSat.id)}
      transmitters={satnogsTransmitters.get(detailSat.id)}
      observer={observer}
      pass={detailPass}
      onClose={() => setDetailSatId(null)}
    />
  );

  const detailPassObj = useMemo(
    () => (detailPassKey ? sortedPasses.find((p) => passKey(p) === detailPassKey) ?? null : null),
    [detailPassKey, sortedPasses, passKey],
  );

  const passDetailPopup = detailPassObj && (
    <PassDetail
      pass={detailPassObj}
      tle={tleMap.get(detailPassObj.satId)}
      observer={observer}
      now={now}
      color={
        GROUP_COLORS[
          (allSatellites.find((s) => s.id === detailPassObj.satId)?.group ?? 'active') as SatelliteGroup
        ] || '#00d4ff'
      }
      onClose={() => setDetailPassKey(null)}
    />
  );

  return (
    <>
      {/* Desktop: collapsed sidebar toggle */}
      {isSidebarCollapsed && (
        <button
          onClick={toggleSidebarCollapsed}
          className="hidden md:flex shrink-0 w-8 items-center justify-center bg-gray-900 border-l border-gray-800 hover:bg-gray-800 transition-colors cursor-pointer"
          title="Expand sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-400">
            <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
        </button>
      )}

      {/* Desktop: resize handle between globe and sidebar */}
      {!isSidebarCollapsed && (
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
      )}

      <aside
        ref={sidebarRef}
        id="sat-sidebar"
        className={`
          fixed inset-x-0 bottom-0 z-30 h-[55vh] rounded-t-2xl
          transform transition-transform duration-300 ease-in-out
          ${isMobilePanelOpen ? 'translate-y-0' : 'translate-y-full'}
          md:relative md:transform-none md:translate-y-0 md:h-auto md:rounded-none md:z-auto
          md:w-80 shrink-0 bg-gray-900 border-l border-gray-800 overflow-hidden flex flex-col
          ${isSidebarCollapsed ? 'md:hidden' : ''}
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Satellites ({allSatellites.length})
            </h2>
            <button
              onClick={toggleSidebarCollapsed}
              className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
              title="Collapse sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
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
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h4 className="text-xs text-gray-500 uppercase tracking-wider">
                    Passes (24h) &middot; {visiblePasses.length}
                  </h4>
                  <button
                    onClick={() => setVisibleOnly(!visibleOnly)}
                    className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                      visibleOnly
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-gray-800 text-gray-500 border-gray-700 hover:text-gray-300'
                    }`}
                    title="Only passes you can actually see with the naked eye"
                  >
                    &#128065; Visible {visibleCount > 0 ? `(${visibleCount})` : ''}
                  </button>
                </div>
                <ul className="space-y-2 max-h-[40vh] overflow-y-auto">
                  {visiblePasses.slice(0, 20).map((pass, i) => (
                    <PassListItem
                      key={`${pass.satId}-${i}`}
                      pass={pass} index={i}
                      isBest={`${pass.satId}-${pass.startTime.getTime()}` === bestPassKey}
                      doppler={dopplerMap.get(`${pass.satId}-${pass.startTime.getTime()}`)}
                      profile={getRadioProfile(pass.satId)}
                      isSelected={selectedSatIds.includes(pass.satId)}
                      now={now} observer={observer}
                      tleData={tleMap.get(pass.satId)}
                      detailSatId={detailSatId} setDetailSatId={setDetailSatId}
                      selectSatellite={selectSatellite}
                      formatTime={formatTime} formatDuration={formatDuration}
                      formatCountdown={formatCountdown} formatLiveLabel={formatLiveLabel}
                      visibility={visibilityMap.get(passKey(pass))}
                      onOpenDetail={(p) => setDetailPassKey(passKey(p))}
                      compact
                    />
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-gray-500">No passes in next 24h</p>
            )}
          </div>
        )}

        {!observer && (
          <div className="border-t border-gray-800 p-4 shrink-0 space-y-2">
            <p className="text-xs text-gray-500">
              Set your location to see which satellites pass over you, when, and where to point.
            </p>
            <button
              onClick={() => setObserverPickerOpen(true)}
              className="px-2.5 py-1.5 rounded text-xs font-medium bg-orange-500/15 text-orange-300 border border-orange-500/30 hover:bg-orange-500/25 transition-colors"
            >
              Set my location
            </button>
          </div>
        )}
      </div>

      {detailPopup}
      {passDetailPopup}
    </aside>
    </>
  );
}
