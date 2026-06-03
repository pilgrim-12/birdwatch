import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Satellite, ObserverLocation, SatellitePosition, TLEData } from '@/types/satellite';
import type { SatellitePass } from '@/lib/passes';
import type { SatelliteGroup } from '@/lib/constants';
import type { SatNogsInfo, SatNogsTransmitter } from '@/types/satnogs';

export type CameraFollow = 'none' | 'track' | 'sat-pov';

interface SatelliteStore {
  satellites: Satellite[];
  observer: ObserverLocation | null;
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
  nightMode: boolean;
  beamOpacity: number; // 0-100
  beamWidth: number; // stroke thickness 1-10
  beamSpeed: number; // 0=off, 1=slow, 2=normal, 3=fast
  activeGroups: SatelliteGroup[];

  // Mass group (Starlink) — separate rendering pipeline
  massSatellites: Satellite[];
  massPositions: Map<number, SatellitePosition>;

  setSatellites: (satellites: Satellite[]) => void;
  setObserver: (observer: ObserverLocation | null) => void;
  selectSatellite: (id: number | null) => void; // toggle: adds/removes from selection
  deselectSatellite: (id: number) => void;
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
  toggleNightMode: () => void;
  setBeamOpacity: (value: number) => void;
  setBeamWidth: (width: number) => void;
  setBeamSpeed: (speed: number) => void;
  toggleGroup: (group: SatelliteGroup) => void;
  setActiveGroups: (groups: SatelliteGroup[]) => void;
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

  // Data sources toggles (persisted)
  sourceCelestrak: boolean;
  sourceSatnogs: boolean;
  toggleSourceCelestrak: () => void;
  toggleSourceSatnogs: () => void;

  // Satellite collection (persisted)
  collectionSatIds: number[];
  collectionTLEs: Record<number, { name: string; tle: TLEData }>;
  addToCollection: (sat: Satellite) => void;
  removeFromCollection: (id: number) => void;
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
  showLabels: true,
  showBeams: true,
  showLookLine: false,
  showGroundLine: false,
  showFootprint: false,
  nightMode: true,
  beamOpacity: 50,
  beamWidth: 2,
  beamSpeed: 2,
  activeGroups: ['stations', 'weather', 'noaa', 'iridium', 'amateur'],
  massSatellites: [],
  massPositions: new Map(),

  setSatellites: (satellites) => set({ satellites }),
  setObserver: (observer) => set({ observer }),
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

  // Map mode
  mapMode: 'globe',
  toggleMapMode: () => set((s) => ({ mapMode: s.mapMode === 'globe' ? 'flat' : 'globe' })),

  // Data sources toggles
  sourceCelestrak: true,
  sourceSatnogs: true,
  toggleSourceCelestrak: () => set((s) => ({ sourceCelestrak: !s.sourceCelestrak })),
  toggleSourceSatnogs: () => set((s) => ({ sourceSatnogs: !s.sourceSatnogs, satnogsLoaded: false })),

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
        nightMode: state.nightMode,
        beamOpacity: state.beamOpacity,
        beamWidth: state.beamWidth,
        beamSpeed: state.beamSpeed,
        activeGroups: state.activeGroups,
        sidebarWidth: state.sidebarWidth,
        mapMode: state.mapMode,
        sourceCelestrak: state.sourceCelestrak,
        sourceSatnogs: state.sourceSatnogs,
        collectionSatIds: state.collectionSatIds,
        collectionTLEs: state.collectionTLEs,
      }),
    },
  ),
);
