import { create } from 'zustand';
import type { Satellite, ObserverLocation, SatellitePosition } from '@/types/satellite';
import type { SatellitePass } from '@/lib/passes';

interface SatelliteStore {
  satellites: Satellite[];
  observer: ObserverLocation | null;
  selectedSatId: number | null;
  positions: Map<number, SatellitePosition>;
  passes: SatellitePass[];
  showTrajectories: boolean;
  showLabels: boolean;

  setSatellites: (satellites: Satellite[]) => void;
  setObserver: (observer: ObserverLocation) => void;
  selectSatellite: (id: number | null) => void;
  updatePositions: (positions: Map<number, SatellitePosition>) => void;
  setPasses: (passes: SatellitePass[]) => void;
  toggleTrajectories: () => void;
  toggleLabels: () => void;
}

export const useSatelliteStore = create<SatelliteStore>((set) => ({
  satellites: [],
  observer: null,
  selectedSatId: null,
  positions: new Map(),
  passes: [],
  showTrajectories: false,
  showLabels: true,

  setSatellites: (satellites) => set({ satellites }),
  setObserver: (observer) => set({ observer }),
  selectSatellite: (id) => set({ selectedSatId: id }),
  updatePositions: (positions) => set({ positions }),
  setPasses: (passes) => set({ passes }),
  toggleTrajectories: () => set((s) => ({ showTrajectories: !s.showTrajectories })),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
}));
