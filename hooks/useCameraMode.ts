'use client';

import { useEffect, useRef, useCallback } from 'react';
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

/**
 * Free camera hook — permanently unlocks OrbitControls:
 * - Pan (right-click drag or shift+left-drag) to shift camera laterally
 * - Free orbit pivot — double-click any point to set new rotation center
 * - Adaptive speed — rotate/zoom speed adjusts based on distance to target
 * - Near-surface adjustment — camera.near adapts when close to globe
 * - Follow modes (track / sat-pov) for continuous satellite following
 */
export function useCameraMode(globeRef: GlobeRef): void {
  const cameraFollow = useSatelliteStore((s) => s.cameraFollow);
  const setCameraFollow = useSatelliteStore((s) => s.setCameraFollow);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originalListenersRef = useRef<((...args: any[]) => void)[] | null>(null);
  const isOverriddenRef = useRef(false);
  const controlsReadyRef = useRef(false);

  const transitionRef = useRef<Transition | null>(null);
  const prevTargetRef = useRef(new THREE.Vector3());
  const rafIdRef = useRef<number | null>(null);

  // Replacement change listener — does NOT reset target to origin
  const replacementListenerRef = useRef(function replacementListener() {
    const globe = globeRef.current;
    if (!globe) return;
    try {
      const controls = globe.controls() as ControlsAny;
      const camera = globe.camera() as THREE.PerspectiveCamera;

      // Adaptive speed based on distance to target
      const dist = camera.position.distanceTo(controls.target);
      const normalizedDist = dist / GLOBE_RADIUS;
      controls.rotateSpeed = Math.max(0.05, normalizedDist * 0.3);
      controls.zoomSpeed = Math.max(0.1, Math.sqrt(normalizedDist) * 0.5);

      // Adaptive near plane — prevent clipping when close to surface
      const distToOrigin = camera.position.length();
      const altAboveSurface = distToOrigin - GLOBE_RADIUS;
      if (altAboveSurface < GLOBE_RADIUS * 0.05) {
        camera.near = 0.01;
      } else if (altAboveSurface < GLOBE_RADIUS * 0.2) {
        camera.near = 0.05;
      } else {
        camera.near = 0.1;
      }
      camera.updateProjectionMatrix();
    } catch {
      // ignore
    }
  });

  function overrideListeners(controls: ControlsAny) {
    if (isOverriddenRef.current) return;
    isOverriddenRef.current = true;

    const existing = controls._listeners?.['change'];
    if (existing) {
      for (const fn of [...existing]) {
        controls.removeEventListener('change', fn);
      }
    }

    controls.addEventListener('change', replacementListenerRef.current);
  }

  // Capture original listeners, then permanently override for free camera
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    const timer = setInterval(() => {
      try {
        const controls = globe.controls() as ControlsAny;
        if (controls && !controlsReadyRef.current) {
          // Capture originals
          const changeListeners = controls._listeners?.['change'];
          if (changeListeners && changeListeners.length > 0) {
            originalListenersRef.current = [...changeListeners];
          }
          controlsReadyRef.current = true;

          // Permanently override — free camera is always active
          overrideListeners(controls);

          // Enable pan (shift+left-drag or right-drag)
          controls.enablePan = true;
          controls.panSpeed = 0.5;

          // Relax constraints for free movement
          controls.minDistance = 1;
          controls.maxDistance = GLOBE_RADIUS * 12;
          controls.enableDamping = true;
          controls.dampingFactor = 0.1;

          clearInterval(timer);
        }
      } catch {
        // Globe not ready yet
      }
    }, 300);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globeRef]);

  // Double-click on canvas to set new orbit pivot
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    // Wait for scene to be ready
    const timer = setInterval(() => {
      try {
        const renderer = globe.renderer();
        if (!renderer) return;
        const canvas = renderer.domElement as HTMLCanvasElement;
        if (!canvas) return;
        clearInterval(timer);

        const handleDblClick = (e: MouseEvent) => {
          // Raycast from mouse position to find globe intersection
          const rect = canvas.getBoundingClientRect();
          const mouse = new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1,
          );

          const camera = globe.camera() as THREE.PerspectiveCamera;
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(mouse, camera);

          // Intersect with a sphere at globe radius
          const globeSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), GLOBE_RADIUS);
          const intersectPoint = new THREE.Vector3();
          const hit = raycaster.ray.intersectSphere(globeSphere, intersectPoint);

          if (hit) {
            const controls = globe.controls() as ControlsAny;
            if (!controls) return;

            // Stop any follow mode
            useSatelliteStore.getState().setCameraFollow('none');

            // Smooth transition to new pivot
            transitionRef.current = {
              startTime: performance.now(),
              duration: 500,
              startPos: camera.position.clone(),
              endPos: camera.position.clone(), // keep camera where it is
              startTarget: controls.target.clone(),
              endTarget: intersectPoint.clone(),
            };
          }
        };

        canvas.addEventListener('dblclick', handleDblClick);
        // Store cleanup ref
        (canvas as ControlsAny).__freeCamDblClick = handleDblClick;
      } catch {
        // not ready
      }
    }, 500);

    return () => {
      clearInterval(timer);
      try {
        const renderer = globeRef.current?.renderer();
        const canvas = renderer?.domElement as ControlsAny;
        if (canvas?.__freeCamDblClick) {
          canvas.removeEventListener('dblclick', canvas.__freeCamDblClick);
          delete canvas.__freeCamDblClick;
        }
      } catch {
        // ignore
      }
    };
  }, [globeRef]);

  // Main animation loop — always running for transitions + follow modes
  useEffect(() => {
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

      // Handle smooth transitions (pivot change, preset fly-to)
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
          prevTargetRef.current.copy(tr.endTarget);
        }
        return;
      }

      // Follow modes
      const store = useSatelliteStore.getState();

      if (store.cameraFollow === 'none') {
        controls.update();
        return;
      }

      // Auto-stop follow if satellite deselected
      if (store.selectedSatId === null) {
        setCameraFollow('none');
        return;
      }

      const pos = store.positions.get(store.selectedSatId)
        ?? store.massPositions.get(store.selectedSatId);
      if (!pos) return;

      const relAlt = pos.alt / EARTH_RADIUS_KM;

      if (store.cameraFollow === 'track') {
        // Delta-based tracking: shift camera + target by satellite movement
        const newTarget = polar2Cartesian(pos.lat, pos.lng, relAlt);

        if (prevTargetRef.current.length() < 0.001) {
          // First frame — initialize
          prevTargetRef.current.copy(newTarget);
          controls.target.copy(newTarget);
        } else {
          const delta = new THREE.Vector3().subVectors(newTarget, prevTargetRef.current);
          if (delta.length() > 0.001) {
            camera.position.add(delta);
            controls.target.copy(newTarget);
            prevTargetRef.current.copy(newTarget);
          }
        }
      } else if (store.cameraFollow === 'sat-pov') {
        // Camera at satellite, looking at Earth
        const satPos = polar2Cartesian(pos.lat, pos.lng, relAlt);
        camera.position.copy(satPos);
        controls.target.setScalar(0);

        const dist = satPos.length();
        controls.minDistance = dist - 2;
        controls.maxDistance = dist + 2;
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
  }, [globeRef]);

  // Public method for presets to trigger transitions
  // Exposed via a ref on the globe element (avoids prop drilling)
  const flyTo = useCallback((
    endPos: THREE.Vector3,
    endTarget: THREE.Vector3,
    duration = 800,
    endNear?: number,
  ) => {
    const globe = globeRef.current;
    if (!globe) return;
    try {
      const controls = globe.controls() as ControlsAny;
      const camera = globe.camera() as THREE.PerspectiveCamera;
      if (!controls) return;

      transitionRef.current = {
        startTime: performance.now(),
        duration,
        startPos: camera.position.clone(),
        endPos,
        startTarget: controls.target.clone(),
        endTarget,
        startNear: endNear !== undefined ? camera.near : undefined,
        endNear,
      };
    } catch {
      // ignore
    }
  }, [globeRef]);

  // Expose flyTo on globeRef for CameraControls to use
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.__freeCamFlyTo = flyTo;
    }
  }, [globeRef, flyTo]);
}
