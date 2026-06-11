'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { EARTH_RADIUS_KM } from '@/lib/constants';
import { polar2Cartesian, GLOBE_RADIUS } from '@/lib/globe-math';
import type { GlobeRef } from '@/types/globe';

interface CameraControlsProps {
  globeRef: GlobeRef;
}

export function CameraControls({ globeRef }: CameraControlsProps) {
  const selectedSatIds = useSatelliteStore((s) => s.selectedSatIds);
  const selectedSatId = selectedSatIds.length > 0 ? selectedSatIds[selectedSatIds.length - 1] : null;
  const observer = useSatelliteStore((s) => s.observer);
  const cameraFollow = useSatelliteStore((s) => s.cameraFollow);
  const setCameraFollow = useSatelliteStore((s) => s.setCameraFollow);
  const positions = useSatelliteStore((s) => s.positions);
  const massPositions = useSatelliteStore((s) => s.massPositions);

  const stateRef = useRef({ selectedSatId, selectedSatIds, observer, positions, massPositions, cameraFollow });
  useEffect(() => {
    stateRef.current = { selectedSatId, selectedSatIds, observer, positions, massPositions, cameraFollow };
  });

  // Stop follow when satellite deselected
  useEffect(() => {
    if (selectedSatIds.length === 0 && cameraFollow !== 'none') {
      setCameraFollow('none');
    }
  }, [selectedSatIds, cameraFollow, setCameraFollow]);

  const flyTo = (endPos: THREE.Vector3, endTarget: THREE.Vector3, duration = 800) => {
    const globe = globeRef.current;
    if (!globe) return;
    if (globe.__freeCamFlyTo) {
      globe.__freeCamFlyTo(endPos, endTarget, duration);
    }
  };

  const handleReset = () => {
    setCameraFollow('none');
    // Reset target to Earth center, camera to default overview position
    const endTarget = new THREE.Vector3(0, 0, 0);
    const endPos = polar2Cartesian(20, 0, 1.5);
    flyTo(endPos, endTarget, 1000);
  };

  const handleFocusSat = () => {
    const { selectedSatId: id, positions: pos, massPositions: mPos } = stateRef.current;
    if (id === null) return;
    const p = pos.get(id) ?? mPos.get(id);
    if (!p) return;

    setCameraFollow('none');
    const relAlt = p.alt / EARTH_RADIUS_KM;
    const satPos3D = polar2Cartesian(p.lat, p.lng, relAlt);

    // Position camera at offset from satellite, target on satellite
    const dirFromCenter = satPos3D.clone().normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const offsetDir = new THREE.Vector3().crossVectors(up, dirFromCenter).normalize();
    if (offsetDir.length() < 0.01) offsetDir.set(1, 0, 0);
    const orbitDist = Math.max(15, relAlt * GLOBE_RADIUS * 0.3);
    const endCamPos = satPos3D.clone().add(offsetDir.multiplyScalar(orbitDist));

    flyTo(endCamPos, satPos3D, 800);
  };

  const handleTrack = () => {
    const { selectedSatId: id, positions: pos, massPositions: mPos, cameraFollow: follow } = stateRef.current;
    if (id === null) return;
    if (follow === 'track') {
      setCameraFollow('none');
    } else {
      // Fly to satellite first, then start tracking
      const p = pos.get(id) ?? mPos.get(id);
      if (p) {
        const relAlt = p.alt / EARTH_RADIUS_KM;
        const satPos3D = polar2Cartesian(p.lat, p.lng, relAlt);
        const dirFromCenter = satPos3D.clone().normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const offsetDir = new THREE.Vector3().crossVectors(up, dirFromCenter).normalize();
        if (offsetDir.length() < 0.01) offsetDir.set(1, 0, 0);
        const orbitDist = Math.max(15, relAlt * GLOBE_RADIUS * 0.3);
        const endCamPos = satPos3D.clone().add(offsetDir.multiplyScalar(orbitDist));
        flyTo(endCamPos, satPos3D, 800);
      }
      setCameraFollow('track');
    }
  };

  const handleGroundView = () => {
    const { observer: obs } = stateRef.current;
    if (!obs) return;
    setCameraFollow('none');

    const surfacePos = polar2Cartesian(obs.lat, obs.lng, 0.002);
    const zenith = polar2Cartesian(obs.lat, obs.lng, 0.15);
    flyTo(surfacePos, zenith, 800);
  };

  const handleSatPov = () => {
    const { selectedSatId: id, positions: pos, massPositions: mPos, cameraFollow: follow } = stateRef.current;
    if (id === null) return;
    if (follow === 'sat-pov') {
      setCameraFollow('none');
    } else {
      const p = pos.get(id) ?? mPos.get(id);
      if (!p) return;

      const relAlt = p.alt / EARTH_RADIUS_KM;
      const satPos3D = polar2Cartesian(p.lat, p.lng, relAlt);
      const earthCenter = new THREE.Vector3(0, 0, 0);
      flyTo(satPos3D, earthCenter, 800);
      setCameraFollow('sat-pov');
    }
  };

  const handleGoObserver = () => {
    const { observer: obs } = stateRef.current;
    if (!obs) return;
    setCameraFollow('none');

    const obsPos = polar2Cartesian(obs.lat, obs.lng, 0);
    const endCamPos = polar2Cartesian(obs.lat, obs.lng, 0.4);
    flyTo(endCamPos, obsPos, 800);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key.toLowerCase()) {
        case 'r':
        case 'escape':
          handleReset();
          break;
        case 'f':
          handleFocusSat();
          break;
        case 't':
          handleTrack();
          break;
        case 'g':
          handleGroundView();
          break;
        case 'v':
          handleSatPov();
          break;
        case 'o':
          handleGoObserver();
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
  const btnNormal = `${btnBase} text-gray-400 hover:text-white hover:bg-gray-700/50`;
  const btnActive = `${btnBase} text-cyan-400 bg-cyan-500/20 hover:bg-cyan-500/30`;

  return (
    <div className="absolute top-4 right-4 md:top-auto md:bottom-4 md:left-4 md:right-auto flex flex-col gap-1 bg-gray-900/70 backdrop-blur-sm rounded-lg p-1.5 border border-gray-700/50 z-10">
      {/* Reset / Home */}
      <button className={btnNormal} onClick={handleReset} title="Reset view (R)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="6" />
          <ellipse cx="8" cy="8" rx="2.5" ry="6" />
          <line x1="2" y1="8" x2="14" y2="8" />
        </svg>
      </button>

      {/* Focus Satellite */}
      <button className={btnNormal} onClick={handleFocusSat} disabled={!hasSat} title="Focus satellite (F)">
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
        className={cameraFollow === 'track' ? btnActive : btnNormal}
        onClick={handleTrack}
        disabled={!hasSat}
        title={cameraFollow === 'track' ? 'Stop tracking (T)' : 'Track satellite (T)'}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="8" cy="8" r="2" />
          <circle cx="8" cy="8" r="5" strokeDasharray="3,2" />
          {cameraFollow === 'track' && <circle cx="8" cy="8" r="7" strokeDasharray="2,2" opacity="0.5" />}
        </svg>
      </button>

      <div className="w-6 h-px bg-gray-700/50 mx-auto my-0.5" />

      {/* Ground View — camera at observer, looking up at sky */}
      <button className={btnNormal} onClick={handleGroundView} disabled={!hasObs} title="Ground sky view (G)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 14h10" />
          <path d="M8 14V9" />
          <path d="M5 9l3-5 3 5" />
          <circle cx="8" cy="3" r="1" />
        </svg>
      </button>

      {/* Satellite POV — camera at satellite, looking down */}
      <button
        className={cameraFollow === 'sat-pov' ? btnActive : btnNormal}
        onClick={handleSatPov}
        disabled={!hasSat}
        title={cameraFollow === 'sat-pov' ? 'Exit satellite POV (V)' : 'Satellite POV (V)'}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 2l4 4-2 2-4-4z" />
          <path d="M6 6L2 14" />
          <line x1="3" y1="3" x2="5" y2="5" />
          <circle cx="12" cy="12" r="2" />
          <path d="M10 14a4 4 0 0 0 4-4" />
        </svg>
      </button>

      {/* Go to Observer */}
      <button className={btnNormal} onClick={handleGoObserver} disabled={!hasObs} title="Go to observer (O)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 1C5.8 1 4 2.8 4 5c0 3 4 8 4 8s4-5 4-8c0-2.2-1.8-4-4-4z" />
          <circle cx="8" cy="5" r="1.5" />
        </svg>
      </button>
    </div>
  );
}
