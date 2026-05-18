'use client';

import { useEffect, useRef, useState } from 'react';
import { useSatelliteStore } from '@/store/useSatelliteStore';

interface CameraControlsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globeRef: React.MutableRefObject<any>;
}

export function CameraControls({ globeRef }: CameraControlsProps) {
  const selectedSatId = useSatelliteStore((s) => s.selectedSatId);
  const positions = useSatelliteStore((s) => s.positions);
  const massPositions = useSatelliteStore((s) => s.massPositions);
  const observer = useSatelliteStore((s) => s.observer);

  const [tracking, setTracking] = useState(false);

  // Stable ref to avoid re-attaching keydown listener on every position tick
  const stateRef = useRef({ selectedSatId, positions, massPositions, observer, tracking });
  useEffect(() => {
    stateRef.current = { selectedSatId, positions, massPositions, observer, tracking };
  });

  // Stop tracking when satellite is deselected
  useEffect(() => {
    if (selectedSatId === null) setTracking(false);
  }, [selectedSatId]);

  const flyTo = (lat: number, lng: number, altitude: number, ms = 1000) => {
    globeRef.current?.pointOfView({ lat, lng, altitude }, ms);
  };

  const handleReset = () => {
    setTracking(false);
    flyTo(20, 0, 2.5);
  };

  const handleFocusSat = () => {
    const { selectedSatId: id, positions: pos, massPositions: mPos } = stateRef.current;
    if (id === null) return;
    const p = pos.get(id) ?? mPos.get(id);
    if (!p) return;
    const current = globeRef.current?.pointOfView();
    const alt = current ? Math.min(current.altitude, 1.5) : 1.5;
    flyTo(p.lat, p.lng, alt, 800);
  };

  const handleToggleTracking = () => {
    const { selectedSatId: id } = stateRef.current;
    if (id === null) return;
    setTracking((prev) => !prev);
    // Initial focus when starting tracking
    if (!stateRef.current.tracking) {
      handleFocusSat();
    }
  };

  const handleGoObserver = () => {
    const { observer: obs } = stateRef.current;
    if (!obs) return;
    setTracking(false);
    flyTo(obs.lat, obs.lng, 0.5, 800);
  };

  const handleCloseView = () => {
    const { selectedSatId: id, positions: pos, massPositions: mPos } = stateRef.current;
    if (id === null) return;
    const p = pos.get(id) ?? mPos.get(id);
    if (!p) return;
    flyTo(p.lat, p.lng, 0.15, 800);
  };

  const handleTopDown = () => {
    setTracking(false);
    const current = globeRef.current?.pointOfView();
    flyTo(89.9, current?.lng ?? 0, 3.0);
  };

  // Continuous tracking: update camera to follow satellite every 500ms
  useEffect(() => {
    if (!tracking) return;
    const interval = setInterval(() => {
      const { selectedSatId: id, positions: pos, massPositions: mPos } = stateRef.current;
      if (id === null) { setTracking(false); return; }
      const p = pos.get(id) ?? mPos.get(id);
      if (!p) return;
      const current = globeRef.current?.pointOfView();
      if (!current) return;
      globeRef.current.pointOfView({ lat: p.lat, lng: p.lng, altitude: current.altitude }, 600);
    }, 500);
    return () => clearInterval(interval);
  }, [tracking, globeRef]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key.toLowerCase()) {
        case 'r':
          handleReset();
          break;
        case 'f':
          handleFocusSat();
          break;
        case 'o':
          handleGoObserver();
          break;
        case 't':
          handleToggleTracking();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasSat = selectedSatId !== null;
  const hasObs = observer !== null;

  const btnBase =
    'w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400';

  return (
    <div className="absolute top-4 right-4 md:top-auto md:bottom-4 md:left-4 md:right-auto flex flex-col gap-1 bg-gray-900/70 backdrop-blur-sm rounded-lg p-1.5 border border-gray-700/50 z-10">
      {/* Reset View */}
      <button
        className={`${btnBase} text-gray-400 hover:text-white hover:bg-gray-700/50`}
        onClick={handleReset}
        title="Reset view (R)"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 1L3 5.5V14h4v-4h2v4h4V5.5L8 1z" />
        </svg>
      </button>

      {/* Focus Satellite (one-time) */}
      <button
        className={`${btnBase} text-gray-400 hover:text-white hover:bg-gray-700/50`}
        onClick={handleFocusSat}
        disabled={!hasSat}
        title="Focus satellite (F)"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="8" cy="8" r="3" />
          <line x1="8" y1="1" x2="8" y2="4" />
          <line x1="8" y1="12" x2="8" y2="15" />
          <line x1="1" y1="8" x2="4" y2="8" />
          <line x1="12" y1="8" x2="15" y2="8" />
        </svg>
      </button>

      {/* Track Satellite (continuous follow) */}
      <button
        className={`${btnBase} ${
          tracking
            ? 'text-cyan-400 bg-cyan-500/20 hover:bg-cyan-500/30'
            : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
        }`}
        onClick={handleToggleTracking}
        disabled={!hasSat}
        title={tracking ? 'Stop tracking (T)' : 'Track satellite (T)'}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="8" cy="8" r="2" />
          <circle cx="8" cy="8" r="5" strokeDasharray="3,2" />
          {tracking && <circle cx="8" cy="8" r="7" strokeDasharray="2,2" opacity="0.5" />}
        </svg>
      </button>

      {/* Close-up view */}
      <button
        className={`${btnBase} text-gray-400 hover:text-white hover:bg-gray-700/50`}
        onClick={handleCloseView}
        disabled={!hasSat}
        title="Close-up view"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="7" cy="7" r="4" />
          <line x1="10" y1="10" x2="14" y2="14" />
          <line x1="5" y1="7" x2="9" y2="7" />
          <line x1="7" y1="5" x2="7" y2="9" />
        </svg>
      </button>

      {/* Go to Observer */}
      <button
        className={`${btnBase} text-gray-400 hover:text-white hover:bg-gray-700/50`}
        onClick={handleGoObserver}
        disabled={!hasObs}
        title="Go to observer (O)"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 1C5.8 1 4 2.8 4 5c0 3 4 8 4 8s4-5 4-8c0-2.2-1.8-4-4-4z" />
          <circle cx="8" cy="5" r="1.5" />
        </svg>
      </button>

      {/* Top-Down View */}
      <button
        className={`${btnBase} text-gray-400 hover:text-white hover:bg-gray-700/50`}
        onClick={handleTopDown}
        title="Top-down view"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="6" r="3" />
          <line x1="8" y1="10" x2="8" y2="15" />
          <polyline points="5.5,12.5 8,15 10.5,12.5" />
        </svg>
      </button>
    </div>
  );
}
