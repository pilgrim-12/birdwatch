'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { EARTH_RADIUS_KM } from '@/lib/constants';
import { polar2Cartesian, GLOBE_RADIUS } from '@/lib/globe-math';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GlobeRef = React.MutableRefObject<any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ControlsAny = any;

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

interface Transition {
  startTime: number;
  duration: number;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  startTarget: THREE.Vector3;
  endTarget: THREE.Vector3;
  startNear?: number;
  endNear?: number;
}

export function useCameraMode(globeRef: GlobeRef): void {
  const cameraMode = useSatelliteStore((s) => s.cameraMode);
  const setCameraMode = useSatelliteStore((s) => s.setCameraMode);
  const pivotPoint = useSatelliteStore((s) => s.pivotPoint);

  // Refs for listener management
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originalListenersRef = useRef<((...args: any[]) => void)[] | null>(null);
  const isOverriddenRef = useRef(false);
  const controlsReadyRef = useRef(false);

  // Ref for animation state
  const prevTargetRef = useRef(new THREE.Vector3());
  const transitionRef = useRef<Transition | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

  // Capture original change listeners when globe is ready
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    const timer = setInterval(() => {
      try {
        const controls = globe.controls() as ControlsAny;
        if (controls && !controlsReadyRef.current) {
          // Three.js EventDispatcher stores listeners in _listeners
          const changeListeners = controls._listeners?.['change'];
          if (changeListeners && changeListeners.length > 0) {
            originalListenersRef.current = [...changeListeners];
            controlsReadyRef.current = true;
          }
          clearInterval(timer);
        }
      } catch {
        // Globe not ready yet
      }
    }, 300);

    return () => clearInterval(timer);
  }, [globeRef]);

  // Override / restore OrbitControls listeners
  function overrideListeners(controls: ControlsAny) {
    if (isOverriddenRef.current) return;
    isOverriddenRef.current = true;

    // Remove all original change listeners
    const existing = controls._listeners?.['change'];
    if (existing) {
      for (const fn of [...existing]) {
        controls.removeEventListener('change', fn);
      }
    }

    // Install replacement that does NOT reset target to origin
    controls.addEventListener('change', replacementListener);
  }

  function restoreListeners(controls: ControlsAny) {
    if (!isOverriddenRef.current) return;
    isOverriddenRef.current = false;

    controls.removeEventListener('change', replacementListener);

    // Restore originals
    if (originalListenersRef.current) {
      for (const fn of originalListenersRef.current) {
        controls.addEventListener('change', fn);
      }
    }

    // Reset target to origin
    controls.target.setScalar(0);
  }

  // Replacement change listener for non-earth modes
  function replacementListener() {
    const globe = globeRef.current;
    if (!globe) return;
    try {
      const controls = globe.controls() as ControlsAny;
      const camera = globe.camera() as THREE.PerspectiveCamera;

      // Adjust speed based on distance to target
      const dist = camera.position.distanceTo(controls.target);
      const normalizedDist = dist / GLOBE_RADIUS;
      controls.rotateSpeed = Math.max(0.05, normalizedDist * 0.3);
      controls.zoomSpeed = Math.max(0.1, Math.sqrt(normalizedDist) * 0.5);
    } catch {
      // ignore
    }
  }

  function applyModeConstraints(controls: ControlsAny, mode: string) {
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;

    switch (mode) {
      case 'orbit-satellite':
        controls.minDistance = 3;
        controls.maxDistance = GLOBE_RADIUS * 4;
        break;
      case 'ground-pov':
        controls.minDistance = 0.5;
        controls.maxDistance = GLOBE_RADIUS * 0.5;
        break;
      case 'click-pivot':
        controls.minDistance = GLOBE_RADIUS * 0.05;
        controls.maxDistance = GLOBE_RADIUS * 6;
        break;
      case 'satellite-pov':
        // Will be dynamically set per frame
        controls.minDistance = 1;
        controls.maxDistance = GLOBE_RADIUS * 5;
        break;
    }
  }

  function restoreEarthConstraints(controls: ControlsAny) {
    controls.minDistance = GLOBE_RADIUS * 1.2;
    controls.maxDistance = GLOBE_RADIUS * 8;
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.rotateSpeed = 0.5;
  }

  // Mode transition: override/restore listeners + set constraints
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !controlsReadyRef.current) return;

    let controls: ControlsAny;
    try {
      controls = globe.controls();
      if (!controls) return;
    } catch {
      return;
    }

    const camera = globe.camera() as THREE.PerspectiveCamera;

    if (cameraMode === 'earth') {
      // Restore everything
      restoreListeners(controls);
      restoreEarthConstraints(controls);
      camera.near = 0.1;
      camera.updateProjectionMatrix();
      initializedRef.current = false;
      transitionRef.current = null;
    } else {
      // Override for custom target modes
      // satellite-pov keeps target at origin, but we still override to control speed
      overrideListeners(controls);
      applyModeConstraints(controls, cameraMode);

      // Setup entry transition
      const store = useSatelliteStore.getState();
      const currentPos = camera.position.clone();
      const currentTarget = controls.target.clone();

      if (cameraMode === 'orbit-satellite') {
        const satId = store.selectedSatId;
        if (satId === null) { setCameraMode('earth'); return; }
        const pos = store.positions.get(satId) ?? store.massPositions.get(satId);
        if (!pos) { setCameraMode('earth'); return; }

        const relAlt = pos.alt / EARTH_RADIUS_KM;
        const satPos3D = polar2Cartesian(pos.lat, pos.lng, relAlt);

        // Position camera at an offset from satellite
        const dirFromCenter = satPos3D.clone().normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const offsetDir = new THREE.Vector3().crossVectors(up, dirFromCenter).normalize();
        if (offsetDir.length() < 0.01) offsetDir.set(1, 0, 0);
        const orbitDist = Math.max(15, relAlt * GLOBE_RADIUS * 0.3);
        const endCamPos = satPos3D.clone().add(offsetDir.multiplyScalar(orbitDist));

        transitionRef.current = {
          startTime: performance.now(),
          duration: 800,
          startPos: currentPos,
          endPos: endCamPos,
          startTarget: currentTarget,
          endTarget: satPos3D,
        };
        prevTargetRef.current.copy(satPos3D);

      } else if (cameraMode === 'ground-pov') {
        const obs = store.observer;
        if (!obs) { setCameraMode('earth'); return; }

        const surfacePos = polar2Cartesian(obs.lat, obs.lng, 0.002);
        const zenith = polar2Cartesian(obs.lat, obs.lng, 0.15);

        transitionRef.current = {
          startTime: performance.now(),
          duration: 800,
          startPos: currentPos,
          endPos: surfacePos,
          startTarget: currentTarget,
          endTarget: zenith,
          startNear: camera.near,
          endNear: 0.01,
        };

      } else if (cameraMode === 'click-pivot') {
        // If pivotPoint already set, transition to it. Otherwise wait for click.
        if (store.pivotPoint) {
          const target3D = polar2Cartesian(
            store.pivotPoint.lat,
            store.pivotPoint.lng,
            store.pivotPoint.alt / EARTH_RADIUS_KM,
          );
          transitionRef.current = {
            startTime: performance.now(),
            duration: 500,
            startPos: currentPos,
            endPos: currentPos, // keep camera where it is
            startTarget: currentTarget,
            endTarget: target3D,
          };
        }

      } else if (cameraMode === 'satellite-pov') {
        const satId = store.selectedSatId;
        if (satId === null) { setCameraMode('earth'); return; }
        const pos = store.positions.get(satId) ?? store.massPositions.get(satId);
        if (!pos) { setCameraMode('earth'); return; }

        const relAlt = pos.alt / EARTH_RADIUS_KM;
        const satPos3D = polar2Cartesian(pos.lat, pos.lng, relAlt);

        transitionRef.current = {
          startTime: performance.now(),
          duration: 800,
          startPos: currentPos,
          endPos: satPos3D,
          startTarget: currentTarget,
          endTarget: new THREE.Vector3(0, 0, 0),
        };
      }

      initializedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraMode, globeRef]);

  // Handle pivotPoint changes in click-pivot mode
  useEffect(() => {
    if (cameraMode !== 'click-pivot' || !pivotPoint) return;

    const globe = globeRef.current;
    if (!globe) return;
    let controls: ControlsAny;
    let camera: THREE.PerspectiveCamera;
    try {
      controls = globe.controls();
      camera = globe.camera() as THREE.PerspectiveCamera;
      if (!controls) return;
    } catch {
      return;
    }

    const target3D = polar2Cartesian(
      pivotPoint.lat,
      pivotPoint.lng,
      pivotPoint.alt / EARTH_RADIUS_KM,
    );

    transitionRef.current = {
      startTime: performance.now(),
      duration: 500,
      startPos: camera.position.clone(),
      endPos: camera.position.clone(),
      startTarget: controls.target.clone(),
      endTarget: target3D,
    };
  }, [pivotPoint, cameraMode, globeRef]);

  // Main animation loop for all non-earth modes
  useEffect(() => {
    if (cameraMode === 'earth') {
      // Cancel any running animation
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }

    function animate() {
      rafIdRef.current = requestAnimationFrame(animate);

      const globe = globeRef.current;
      if (!globe) return;

      let controls: ControlsAny;
      let camera: THREE.PerspectiveCamera;
      try {
        controls = globe.controls();
        camera = globe.camera() as THREE.PerspectiveCamera;
        if (!controls) return;
      } catch {
        return;
      }

      const now = performance.now();

      // Handle transition animation
      if (transitionRef.current) {
        const tr = transitionRef.current;
        const elapsed = now - tr.startTime;
        const t = Math.min(elapsed / tr.duration, 1);
        const eased = easeInOutQuad(t);

        camera.position.lerpVectors(tr.startPos, tr.endPos, eased);
        controls.target.lerpVectors(tr.startTarget, tr.endTarget, eased);

        if (tr.startNear !== undefined && tr.endNear !== undefined) {
          camera.near = tr.startNear + (tr.endNear - tr.startNear) * eased;
          camera.updateProjectionMatrix();
        }

        controls.update();

        if (t >= 1) {
          transitionRef.current = null;
          initializedRef.current = true;
          prevTargetRef.current.copy(tr.endTarget);
        }
        return;
      }

      const store = useSatelliteStore.getState();

      // Auto-return to earth if satellite deselected
      if (
        (store.cameraMode === 'orbit-satellite' || store.cameraMode === 'satellite-pov') &&
        store.selectedSatId === null
      ) {
        setCameraMode('earth');
        return;
      }

      switch (store.cameraMode) {
        case 'orbit-satellite': {
          if (store.selectedSatId === null) break;
          const pos = store.positions.get(store.selectedSatId)
            ?? store.massPositions.get(store.selectedSatId);
          if (!pos) break;

          const relAlt = pos.alt / EARTH_RADIUS_KM;
          const newTarget = polar2Cartesian(pos.lat, pos.lng, relAlt);

          if (!initializedRef.current) {
            prevTargetRef.current.copy(newTarget);
            controls.target.copy(newTarget);
            initializedRef.current = true;
            break;
          }

          // Delta-based shift: move both camera and target by satellite's movement
          const delta = new THREE.Vector3().subVectors(newTarget, prevTargetRef.current);
          if (delta.length() > 0.001) {
            camera.position.add(delta);
            controls.target.copy(newTarget);
            prevTargetRef.current.copy(newTarget);
          }
          break;
        }

        case 'satellite-pov': {
          if (store.selectedSatId === null) break;
          const pos = store.positions.get(store.selectedSatId)
            ?? store.massPositions.get(store.selectedSatId);
          if (!pos) break;

          const relAlt = pos.alt / EARTH_RADIUS_KM;
          const satPos = polar2Cartesian(pos.lat, pos.lng, relAlt);

          // Camera at satellite position, looking at Earth center
          camera.position.copy(satPos);
          controls.target.setScalar(0);

          // Lock zoom distance to satellite altitude
          const dist = satPos.length();
          controls.minDistance = dist - 2;
          controls.maxDistance = dist + 2;
          break;
        }

        case 'ground-pov': {
          // Static mode — observer doesn't move.
          // Just ensure target is maintained (in case globe.gl tries to reset)
          if (!initializedRef.current && store.observer) {
            const surfacePos = polar2Cartesian(store.observer.lat, store.observer.lng, 0.002);
            const zenith = polar2Cartesian(store.observer.lat, store.observer.lng, 0.15);
            camera.position.copy(surfacePos);
            controls.target.copy(zenith);
            camera.near = 0.01;
            camera.updateProjectionMatrix();
            initializedRef.current = true;
          }
          break;
        }

        case 'click-pivot': {
          // Static mode — just maintain the target
          // Target is set via pivotPoint effect above
          break;
        }
      }

      controls.update();
    }

    animate();

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraMode, globeRef]);
}
