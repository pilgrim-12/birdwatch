'use client';

import { useEffect, useRef } from 'react';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import type { CameraMode } from '@/store/useSatelliteStore';

interface CameraControlsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globeRef: React.MutableRefObject<any>;
}

export function CameraControls({ globeRef }: CameraControlsProps) {
  const selectedSatId = useSatelliteStore((s) => s.selectedSatId);
  const observer = useSatelliteStore((s) => s.observer);
  const cameraMode = useSatelliteStore((s) => s.cameraMode);
  const setCameraMode = useSatelliteStore((s) => s.setCameraMode);

  // Stable ref for keyboard handler
  const stateRef = useRef({ selectedSatId, observer, cameraMode });
  useEffect(() => {
    stateRef.current = { selectedSatId, observer, cameraMode };
  });

  const handleSetMode = (mode: CameraMode) => {
    const current = stateRef.current;

    if (mode === 'earth') {
      setCameraMode('earth');
      // Also reset camera position via pointOfView
      globeRef.current?.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 1000);
      return;
    }

    // Toggle: if already in this mode, return to earth
    if (current.cameraMode === mode) {
      setCameraMode('earth');
      globeRef.current?.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 1000);
      return;
    }

    // Validation
    if ((mode === 'orbit-satellite' || mode === 'satellite-pov') && current.selectedSatId === null) return;
    if (mode === 'ground-pov' && !current.observer) return;

    setCameraMode(mode);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key.toLowerCase()) {
        case 'r':
        case 'escape':
          handleSetMode('earth');
          break;
        case '1':
          handleSetMode('orbit-satellite');
          break;
        case '2':
          handleSetMode('ground-pov');
          break;
        case '3':
          handleSetMode('click-pivot');
          break;
        case '4':
          handleSetMode('satellite-pov');
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

  const modeBtn = (mode: CameraMode) =>
    `${btnBase} ${
      cameraMode === mode
        ? 'text-cyan-400 bg-cyan-500/20 hover:bg-cyan-500/30'
        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
    }`;

  return (
    <div className="absolute top-4 right-4 md:top-auto md:bottom-4 md:left-4 md:right-auto flex flex-col gap-1 bg-gray-900/70 backdrop-blur-sm rounded-lg p-1.5 border border-gray-700/50 z-10">
      {/* Earth Mode (default) */}
      <button
        className={modeBtn('earth')}
        onClick={() => handleSetMode('earth')}
        title="Earth view (R)"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="6" />
          <ellipse cx="8" cy="8" rx="2.5" ry="6" />
          <line x1="2" y1="8" x2="14" y2="8" />
        </svg>
      </button>

      {/* Orbit Around Satellite */}
      <button
        className={modeBtn('orbit-satellite')}
        onClick={() => handleSetMode('orbit-satellite')}
        disabled={!hasSat}
        title="Orbit satellite (1)"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="8" cy="8" r="2" />
          <ellipse cx="8" cy="8" rx="6" ry="3" transform="rotate(-30 8 8)" strokeDasharray="3,2" />
        </svg>
      </button>

      {/* Ground Station POV */}
      <button
        className={modeBtn('ground-pov')}
        onClick={() => handleSetMode('ground-pov')}
        disabled={!hasObs}
        title="Ground station view (2)"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 14h10" />
          <path d="M8 14V9" />
          <path d="M5 9l3-5 3 5" />
          <circle cx="8" cy="3" r="1" />
        </svg>
      </button>

      {/* Click to Set Pivot */}
      <button
        className={modeBtn('click-pivot')}
        onClick={() => handleSetMode('click-pivot')}
        title="Click to set pivot (3)"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="3" />
          <line x1="8" y1="1" x2="8" y2="4" />
          <line x1="8" y1="12" x2="8" y2="15" />
          <line x1="1" y1="8" x2="4" y2="8" />
          <line x1="12" y1="8" x2="15" y2="8" />
          <circle cx="8" cy="8" r="1" fill="currentColor" />
        </svg>
      </button>

      {/* Satellite POV */}
      <button
        className={modeBtn('satellite-pov')}
        onClick={() => handleSetMode('satellite-pov')}
        disabled={!hasSat}
        title="Satellite POV (4)"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 2l4 4-2 2-4-4z" />
          <path d="M6 6L2 14" />
          <line x1="3" y1="3" x2="5" y2="5" />
          <circle cx="12" cy="12" r="2" />
          <path d="M10 14a4 4 0 0 0 4-4" />
        </svg>
      </button>
    </div>
  );
}
