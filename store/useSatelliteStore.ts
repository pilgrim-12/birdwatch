import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Satellite, ObserverLocation, SatellitePosition, TLEData } from '@/types/satellite';
import type { SatellitePass } from '@/lib/passes';
import type { SatelliteGroup } from '@/lib/constants';
import type { SatNogsInfo, SatNogsTransmitter } from '@/types/satnogs';
import type { GroundStation } from '@/types/groundStation';

export type CameraFollow = 'none' | 'track' | 'sat-pov';

export interface SavedPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  alt: number;
}

interface SatelliteStore {
  satellites: Satellite[];
  observer: ObserverLocation | null;
  /** Human-readable name of the observer location, when it came from a place */
  observerLabel: string | null;
  savedPlaces: SavedPlace[];
  addSavedPlace: (place: Omit<SavedPlace, 'id'>) => void;
  removeSavedPlace: (id: string) => void;
  isObserverPickerOpen: boolean;
  setObserverPickerOpen: (open: boolean) => void;
  selectedSatIds: number[];
  positions: Map<number, SatellitePosition>;
  passes: SatellitePass[];
  searchQuery: string;
  showTrajectories: boolean;
  showLabels: boolean;
  showBeams: boolean;
  showLookLine: boolean;
  showGroundLine: boolean;
  showFootprint: boolean;
  showFlags: boolean;
  nightMode: boolean;
  beamOpacity: number; // 0-100
  beamWidth: number; // stroke thickness 1-10
  beamSpeed: number; // 0=off, 1=slow, 2=normal, 3=fast
  activeGroups: SatelliteGroup[];

  // Mass group (Starlink) — separate rendering pipeline
  massSatellites: Satellite[];
  massPositions: Map<number, SatellitePosition>;

  setSatellites: (satellites: Satellite[]) => void;
  setObserver: (observer: ObserverLocation | null, label?: string | null) => void;
  selectSatellite: (id: number | null) => void; // toggle: adds/removes from selection
  deselectSatellite: (id: number) => void;
  selectSatellites: (ids: number[]) => void; // bulk add (union with current selection)
  deselectSatellites: (ids: number[]) => void; // bulk remove
  clearSelection: () => void;
  setSearchQuery: (q: string) => void;
  updatePositions: (positions: Map<number, SatellitePosition>) => void;
  setPasses: (passes: SatellitePass[]) => void;
  toggleTrajectories: () => void;
  toggleLabels: () => void;
  toggleBeams: () => void;
  toggleLookLine: () => void;
  toggleGroundLine: () => void;
  toggleFootprint: () => void;
  toggleFlags: () => void;
  toggleNightMode: () => void;
  setBeamOpacity: (value: number) => void;
  setBeamWidth: (width: number) => void;
  setBeamSpeed: (speed: number) => void;
  toggleGroup: (group: SatelliteGroup) => void;
  setActiveGroups: (groups: SatelliteGroup[]) => void;
  countryFilter: string | null;
  setCountryFilter: (country: string | null) => void;
  statusFilter: 'all' | 'alive' | 'dead';
  setStatusFilter: (filter: 'all' | 'alive' | 'dead') => void;
  setMassSatellites: (satellites: Satellite[]) => void;
  updateMassPositions: (positions: Map<number, SatellitePosition>) => void;

  // Mobile UI state
  isMobilePanelOpen: boolean;
  isMobileGroupsExpanded: boolean;
  isMobileControlsOpen: boolean;
  mobileTab: 'satellites' | 'passes';
  isMobileMenuOpen: boolean;
  toggleMobilePanel: () => void;
  setMobilePanelOpen: (open: boolean) => void;
  toggleMobileGroups: () => void;
  toggleMobileControls: () => void;
  setMobileTab: (tab: 'satellites' | 'passes') => void;
  setMobileMenuOpen: (open: boolean) => void;

  // Orbit View
  isOrbitViewOpen: boolean;
  orbitViewSelectedSatId: number | null;
  toggleOrbitView: () => void;
  selectOrbitViewSat: (id: number | null) => void;

  // Time scrub — "where was / will the satellite be" timeline.
  // timeOffsetSec is relative to the real clock, so offset 0 always means live.
  isTimelineOpen: boolean;
  timeOffsetSec: number;
  timeWindowSec: number; // half-window the slider covers
  timePlaying: boolean;
  timeRate: number; // playback multiplier (1 = real time)
  toggleTimeline: () => void;
  setTimelineOpen: (open: boolean) => void;
  setTimeOffsetSec: (sec: number) => void;
  nudgeTimeOffset: (deltaSec: number) => void;
  setTimeWindowSec: (sec: number) => void;
  toggleTimePlaying: () => void;
  setTimeRate: (rate: number) => void;
  resetTimeOffset: () => void;

  // Header collapse (desktop)
  isHeaderCollapsed: boolean;
  toggleHeaderCollapsed: () => void;

  // Sidebar resize & collapse (desktop)
  sidebarWidth: number;
  isSidebarCollapsed: boolean;
  setSidebarWidth: (width: number) => void;
  toggleSidebarCollapsed: () => void;

  // Antenna Guide
  isAntennaGuideOpen: boolean;
  antennaGuideFilter: string | null;
  toggleAntennaGuide: () => void;
  openAntennaGuide: (filter?: string) => void;

  // Free camera
  cameraFollow: CameraFollow;
  setCameraFollow: (follow: CameraFollow) => void;

  // SatNOGS enrichment
  satnogsInfo: Map<number, SatNogsInfo>;
  satnogsTransmitters: Map<number, SatNogsTransmitter[]>;
  satnogsLoaded: boolean;
  setSatnogsInfo: (info: Map<number, SatNogsInfo>) => void;
  setSatnogsTransmitters: (tx: Map<number, SatNogsTransmitter[]>) => void;

  // Map mode
  mapMode: 'globe' | 'flat';
  toggleMapMode: () => void;
  setMapMode: (mode: 'globe' | 'flat') => void;

  // Ground stations
  groundStations: GroundStation[];
  showGroundStations: boolean;
  setGroundStations: (stations: GroundStation[]) => void;
  toggleGroundStations: () => void;

  // Data sources toggles (persisted)
  sourceCelestrak: boolean;
  sourceSatnogs: boolean;
  /** Supplement CelesTrak with the NORAD catalogue directly (needs server credentials) */
  sourceSpacetrack: boolean;
  /** Whether the server actually holds those credentials; null until checked */
  spacetrackConfigured: boolean | null;
  setSpacetrackConfigured: (configured: boolean) => void;
  toggleSourceCelestrak: () => void;
  toggleSourceSatnogs: () => void;
  toggleSourceSpacetrack: () => void;

  // Satellite collection (persisted)
  collectionSatIds: number[];
  collectionTLEs: Record<number, { name: string; tle: TLEData }>;
  addToCollection: (sat: Satellite) => void;
  removeFromCollection: (id: number) => void;
}

function clampOffset(sec: number, windowSec: number): number {
  if (!Number.isFinite(sec)) return 0;
  return Math.max(-windowSec, Math.min(windowSec, sec));
}

export const useSatelliteStore = create<SatelliteStore>()(
  persist(
    (set) => ({
  satellites: [],
  observer: null,
  selectedSatIds: [],
  positions: new Map(),
  passes: [],
  searchQuery: '',
  showTrajectories: false,
  showLabels: false,
  showBeams: true,
  showLookLine: false,
  showGroundLine: false,
  showFootprint: false,
  showFlags: false,
  nightMode: true,
  beamOpacity: 50,
  beamWidth: 2,
  beamSpeed: 2,
  activeGroups: ['stations', 'weather', 'noaa', 'iridium', 'amateur'],
  massSatellites: [],
  massPositions: new Map(),

  setSatellites: (satellites) => set({ satellites }),
  observerLabel: null,
  savedPlaces: [],
  setObserver: (observer, label = null) => {
    if (observer) {
      const lat = Math.max(-90, Math.min(90, observer.lat));
      const lng = ((observer.lng + 180) % 360 + 360) % 360 - 180;
      const alt = Math.max(0, observer.alt ?? 0);
      set({ observer: { lat, lng, alt }, observerLabel: label });
    } else {
      set({ observer: null, observerLabel: null });
    }
  },
  addSavedPlace: (place) =>
    set((s) => {
      const id = `${place.lat.toFixed(4)},${place.lng.toFixed(4)}`;
      if (s.savedPlaces.some((p) => p.id === id)) return s;
      return { savedPlaces: [...s.savedPlaces, { ...place, id }] };
    }),
  removeSavedPlace: (id) =>
    set((s) => ({ savedPlaces: s.savedPlaces.filter((p) => p.id !== id) })),
  isObserverPickerOpen: false,
  setObserverPickerOpen: (open) => set({ isObserverPickerOpen: open }),
  selectSatellite: (id) =>
    set((s) => ({
      selectedSatIds: id === null
        ? []
        : s.selectedSatIds.includes(id)
          ? s.selectedSatIds.filter((x) => x !== id)
          : [...s.selectedSatIds, id],
    })),
  deselectSatellite: (id) =>
    set((s) => ({ selectedSatIds: s.selectedSatIds.filter((x) => x !== id) })),
  selectSatellites: (ids) =>
    set((s) => {
      const current = new Set(s.selectedSatIds);
      const added = ids.filter((id) => !current.has(id));
      return added.length === 0 ? s : { selectedSatIds: [...s.selectedSatIds, ...added] };
    }),
  deselectSatellites: (ids) =>
    set((s) => {
      const remove = new Set(ids);
      const next = s.selectedSatIds.filter((id) => !remove.has(id));
      return next.length === s.selectedSatIds.length ? s : { selectedSatIds: next };
    }),
  clearSelection: () => set({ selectedSatIds: [] }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  updatePositions: (positions) => set({ positions }),
  setPasses: (passes) => set({ passes }),
  toggleTrajectories: () => set((s) => ({ showTrajectories: !s.showTrajectories })),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  toggleBeams: () => set((s) => ({ showBeams: !s.showBeams })),
  toggleLookLine: () => set((s) => ({ showLookLine: !s.showLookLine })),
  toggleGroundLine: () => set((s) => ({ showGroundLine: !s.showGroundLine })),
  toggleFootprint: () => set((s) => ({ showFootprint: !s.showFootprint })),
  toggleFlags: () => set((s) => ({ showFlags: !s.showFlags })),
  toggleNightMode: () => set((s) => ({ nightMode: !s.nightMode })),
  setBeamOpacity: (value) => set({ beamOpacity: value }),
  setBeamWidth: (width) => set({ beamWidth: width }),
  setBeamSpeed: (speed) => set({ beamSpeed: speed }),
  toggleGroup: (group) =>
    set((s) => ({
      activeGroups: s.activeGroups.includes(group)
        ? s.activeGroups.filter((g) => g !== group)
        : [...s.activeGroups, group],
    })),
  setActiveGroups: (groups) => set({ activeGroups: groups }),
  countryFilter: null,
  setCountryFilter: (country) => set({ countryFilter: country }),
  statusFilter: 'all',
  setStatusFilter: (filter) => set({ statusFilter: filter }),
  setMassSatellites: (satellites) =>
    set(
      satellites.length === 0
        ? { massSatellites: satellites, massPositions: new Map() }
        : { massSatellites: satellites },
    ),
  updateMassPositions: (positions) => set({ massPositions: positions }),

  // Mobile UI state
  isMobilePanelOpen: false,
  isMobileGroupsExpanded: false,
  isMobileControlsOpen: false,
  mobileTab: 'passes',
  isMobileMenuOpen: false,
  toggleMobilePanel: () => set((s) => ({ isMobilePanelOpen: !s.isMobilePanelOpen })),
  setMobilePanelOpen: (open) => set({ isMobilePanelOpen: open }),
  toggleMobileGroups: () => set((s) => ({ isMobileGroupsExpanded: !s.isMobileGroupsExpanded })),
  toggleMobileControls: () => set((s) => ({ isMobileControlsOpen: !s.isMobileControlsOpen })),
  setMobileTab: (tab) => set({ mobileTab: tab }),
  setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),

  // Orbit View
  isOrbitViewOpen: false,
  orbitViewSelectedSatId: null,
  toggleOrbitView: () =>
    set((s) => ({
      isOrbitViewOpen: !s.isOrbitViewOpen,
      orbitViewSelectedSatId: s.isOrbitViewOpen ? null : s.orbitViewSelectedSatId,
    })),
  selectOrbitViewSat: (id) => set({ orbitViewSelectedSatId: id }),

  // Time scrub
  isTimelineOpen: false,
  timeOffsetSec: 0,
  timeWindowSec: 5400, // ±90 min ≈ one LEO revolution
  timePlaying: false,
  timeRate: 60,
  toggleTimeline: () =>
    set((s) => ({
      isTimelineOpen: !s.isTimelineOpen,
      timeOffsetSec: 0,
      timePlaying: false,
    })),
  setTimelineOpen: (open) =>
    set({ isTimelineOpen: open, timeOffsetSec: 0, timePlaying: false }),
  setTimeOffsetSec: (sec) =>
    set((s) => ({ timeOffsetSec: clampOffset(sec, s.timeWindowSec) })),
  nudgeTimeOffset: (deltaSec) =>
    set((s) => ({ timeOffsetSec: clampOffset(s.timeOffsetSec + deltaSec, s.timeWindowSec) })),
  setTimeWindowSec: (sec) =>
    set((s) => ({ timeWindowSec: sec, timeOffsetSec: clampOffset(s.timeOffsetSec, sec) })),
  toggleTimePlaying: () => set((s) => ({ timePlaying: !s.timePlaying })),
  setTimeRate: (rate) => set({ timeRate: rate }),
  resetTimeOffset: () => set({ timeOffsetSec: 0, timePlaying: false }),

  // Header collapse (desktop)
  isHeaderCollapsed: false,
  toggleHeaderCollapsed: () => set((s) => ({ isHeaderCollapsed: !s.isHeaderCollapsed })),

  // Sidebar resize & collapse (desktop)
  sidebarWidth: 320,
  isSidebarCollapsed: false,
  setSidebarWidth: (width) => set({ sidebarWidth: Math.max(240, Math.min(600, width)) }),
  toggleSidebarCollapsed: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),

  // Antenna Guide
  isAntennaGuideOpen: false,
  antennaGuideFilter: null,
  toggleAntennaGuide: () =>
    set((s) => ({
      isAntennaGuideOpen: !s.isAntennaGuideOpen,
      antennaGuideFilter: s.isAntennaGuideOpen ? null : s.antennaGuideFilter,
    })),
  openAntennaGuide: (filter) =>
    set({ isAntennaGuideOpen: true, antennaGuideFilter: filter ?? null }),

  // Free camera
  cameraFollow: 'none',
  setCameraFollow: (follow) => set({ cameraFollow: follow }),

  // SatNOGS enrichment
  satnogsInfo: new Map(),
  satnogsTransmitters: new Map(),
  satnogsLoaded: false,
  setSatnogsInfo: (info) => set({ satnogsInfo: info, satnogsLoaded: true }),
  setSatnogsTransmitters: (tx) => set({ satnogsTransmitters: tx }),

  // Ground stations
  groundStations: [],
  showGroundStations: false,
  setGroundStations: (stations) => set({ groundStations: stations }),
  toggleGroundStations: () => set((s) => ({ showGroundStations: !s.showGroundStations })),

  // Map mode
  mapMode: 'globe',
  toggleMapMode: () => set((s) => ({ mapMode: s.mapMode === 'globe' ? 'flat' : 'globe' })),
  setMapMode: (mode) => set({ mapMode: mode }),

  // Data sources toggles
  sourceCelestrak: true,
  sourceSatnogs: true,
  sourceSpacetrack: true,
  spacetrackConfigured: null,
  toggleSourceCelestrak: () => set((s) => ({ sourceCelestrak: !s.sourceCelestrak })),
  toggleSourceSatnogs: () => set((s) => ({ sourceSatnogs: !s.sourceSatnogs, satnogsLoaded: false })),
  toggleSourceSpacetrack: () => set((s) => ({ sourceSpacetrack: !s.sourceSpacetrack })),
  setSpacetrackConfigured: (configured) => set({ spacetrackConfigured: configured }),

  // Satellite collection
  collectionSatIds: [],
  collectionTLEs: {},
  addToCollection: (sat) =>
    set((s) => {
      if (s.collectionSatIds.includes(sat.id)) return s;
      return {
        collectionSatIds: [...s.collectionSatIds, sat.id],
        collectionTLEs: { ...s.collectionTLEs, [sat.id]: { name: sat.name, tle: sat.tle } },
      };
    }),
  removeFromCollection: (id) =>
    set((s) => {
      const { [id]: _, ...rest } = s.collectionTLEs;
      return {
        collectionSatIds: s.collectionSatIds.filter((x) => x !== id),
        collectionTLEs: rest,
      };
    }),
    }),
    {
      name: 'birdwatch-settings',
      partialize: (state) => ({
        showTrajectories: state.showTrajectories,
        showLabels: state.showLabels,
        showBeams: state.showBeams,
        showLookLine: state.showLookLine,
        showGroundLine: state.showGroundLine,
        showFootprint: state.showFootprint,
        showFlags: state.showFlags,
        nightMode: state.nightMode,
        beamOpacity: state.beamOpacity,
        beamWidth: state.beamWidth,
        beamSpeed: state.beamSpeed,
        activeGroups: state.activeGroups,
        countryFilter: state.countryFilter,
        showGroundStations: state.showGroundStations,
        sidebarWidth: state.sidebarWidth,
        mapMode: state.mapMode,
        sourceCelestrak: state.sourceCelestrak,
        sourceSatnogs: state.sourceSatnogs,
        sourceSpacetrack: state.sourceSpacetrack,
        collectionSatIds: state.collectionSatIds,
        collectionTLEs: state.collectionTLEs,
        timeWindowSec: state.timeWindowSec,
        timeRate: state.timeRate,
        observer: state.observer,
        observerLabel: state.observerLabel,
        savedPlaces: state.savedPlaces,
      }),
    },
  ),
);
