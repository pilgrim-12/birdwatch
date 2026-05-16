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
  nightMode: boolean;
  activeGroups: SatelliteGroup[];

  setSatellites: (satellites: Satellite[]) => void;
  setObserver: (observer: ObserverLocation) => void;
  selectSatellite: (id: number | null) => void;
  updatePositions: (positions: Map<number, SatellitePosition>) => void;
  setPasses: (passes: SatellitePass[]) => void;
  toggleTrajectories: () => void;
  toggleLabels: () => void;
  toggleNightMode: () => void;
  toggleGroup: (group: SatelliteGroup) => void;
}

export const useSatelliteStore = create<SatelliteStore>((set) => ({
  satellites: [],
  observer: null,
  selectedSatId: null,
  positions: new Map(),
  passes: [],
  showTrajectories: false,
  showLabels: true,
  nightMode: true,
  activeGroups: ['stations', 'weather'],

  setSatellites: (satellites) => set({ satellites }),
  setObserver: (observer) => set({ observer }),
  selectSatellite: (id) => set({ selectedSatId: id }),
  updatePositions: (positions) => set({ positions }),
  setPasses: (passes) => set({ passes }),
  toggleTrajectories: () => set((s) => ({ showTrajectories: !s.showTrajectories })),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  toggleNightMode: () => set((s) => ({ nightMode: !s.nightMode })),
  toggleGroup: (group) =>
    set((s) => ({
      activeGroups: s.activeGroups.includes(group)
        ? s.activeGroups.filter((g) => g !== group)
        : [...s.activeGroups, group],
    })),
}));
