import { create } from 'zustand';
import type { Satellite, ObserverLocation, SatellitePosition } from '@/types/satellite';

interface SatelliteStore {
  satellites: Satellite[];
  observer: ObserverLocation | null;
  selectedSatId: number | null;
  positions: Map<number, SatellitePosition>;

  setSatellites: (satellites: Satellite[]) => void;
  setObserver: (observer: ObserverLocation) => void;
  selectSatellite: (id: number | null) => void;
  updatePositions: (positions: Map<number, SatellitePosition>) => void;
}

export const useSatelliteStore = create<SatelliteStore>((set) => ({
  satellites: [],
  observer: null,
  selectedSatId: null,
  positions: new Map(),

  setSatellites: (satellites) => set({ satellites }),
  setObserver: (observer) => set({ observer }),
  selectSatellite: (id) => set({ selectedSatId: id }),
  updatePositions: (positions) => set({ positions }),
}));
