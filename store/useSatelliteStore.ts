import { create } from 'zustand';
import type { Satellite, ObserverLocation, SatellitePosition } from '@/types/satellite';
import type { SatellitePass } from '@/lib/passes';
import type { SatelliteGroup } from '@/lib/constants';

interface SatelliteStore {
  satellites: Satellite[];
  observer: ObserverLocation | null;
  selectedSatId: number | null;
  positions: Map<number, SatellitePosition>;
  passes: SatellitePass[];
  showTrajectories: boolean;
  showLabels: boolean;
  showBeams: boolean;
  nightMode: boolean;
  beamOpacity: number; // 0-100
  activeGroups: SatelliteGroup[];

  // Mass group (Starlink) — separate rendering pipeline
  massSatellites: Satellite[];
  massPositions: Map<number, SatellitePosition>;

  setSatellites: (satellites: Satellite[]) => void;
  setObserver: (observer: ObserverLocation) => void;
  selectSatellite: (id: number | null) => void;
  updatePositions: (positions: Map<number, SatellitePosition>) => void;
  setPasses: (passes: SatellitePass[]) => void;
  toggleTrajectories: () => void;
  toggleLabels: () => void;
  toggleBeams: () => void;
  toggleNightMode: () => void;
  setBeamOpacity: (value: number) => void;
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
}

export const useSatelliteStore = create<SatelliteStore>((set) => ({
  satellites: [],
  observer: null,
  selectedSatId: null,
  positions: new Map(),
  passes: [],
  showTrajectories: false,
  showLabels: true,
  showBeams: true,
  nightMode: true,
  beamOpacity: 50,
  activeGroups: ['stations', 'weather', 'noaa', 'iridium', 'amateur'],
  massSatellites: [],
  massPositions: new Map(),

  setSatellites: (satellites) => set({ satellites }),
  setObserver: (observer) => set({ observer }),
  selectSatellite: (id) => set({ selectedSatId: id }),
  updatePositions: (positions) => set({ positions }),
  setPasses: (passes) => set({ passes }),
  toggleTrajectories: () => set((s) => ({ showTrajectories: !s.showTrajectories })),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  toggleBeams: () => set((s) => ({ showBeams: !s.showBeams })),
  toggleNightMode: () => set((s) => ({ nightMode: !s.nightMode })),
  setBeamOpacity: (value) => set({ beamOpacity: value }),
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
}));
