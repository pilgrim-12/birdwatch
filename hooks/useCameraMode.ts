'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { EARTH_RADIUS_KM } from '@/lib/constants';
import { polar2Cartesian, GLOBE_RADIUS } from '@/lib/globe-math';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GlobeRef = React.MutableRefObject<any>;

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

interface Transition {
  startTime: number;
  duration: number;
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
}

/**
 * Free camera hook.
 *
 * globe.gl forces `controls.target.setScalar(0)` on every OrbitControls
 * 'change' event, locking the orbit center to Earth's origin. It also
 * overrides rotateSpeed/zoomSpeed in the same listener.
 *
 * Strategy:
 * 1. Override `target.setScalar` so the (0,0,0) reset becomes a no-op
 * 2. Remove globe.gl's change listener entirely
 * 3. Add our own change listener with adaptive speed based on distance to target
 * 4. Run rAF loop for transitions, follow modes, and adaptive near plane
 */
export function useCameraMode(globeRef: GlobeRef): void {
  const patchedRef = useRef(false);
  const transitionRef = useRef<Transition | null>(null);
  const prevSatPosRef = useRef(new THREE.Vector3());
  const rafRef = useRef<number | null>(null);

  // 1. Patch controls once ready + expose flyTo + replace change listener
  useEffect(() => {
    const timer = setInterval(() => {
      const globe = globeRef.current;
      if (!globe || patchedRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let controls: any;
      try {
        controls = globe.controls();
        if (!controls) return;
      } catch {
        return;
      }

      patchedRef.current = true;
      clearInterval(timer);

      // --- Override setScalar on target to block globe.gl's reset ---
      const target = controls.target as THREE.Vector3;
      const origSetScalar = target.setScalar.bind(target);
      target.setScalar = function (s: number) {
        if (s === 0) return this; // block the (0,0,0) reset
        return origSetScalar(s);
      };

      // --- Remove globe.gl's change listener ---
      // It does: setScalar(0) (blocked above), speed overrides (conflict), setPointOfView
      // We replace with our own that only does adaptive speed.
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const listeners = (controls as any)._listeners?.change;
        if (Array.isArray(listeners)) {
          const copy = [...listeners];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          copy.forEach((fn: any) => controls.removeEventListener('change', fn));
        }
      } catch { /* _listeners may not be accessible — setScalar override still protects us */ }

      // --- Our change listener: adaptive speed based on distance to orbit target ---
      controls.addEventListener('change', () => {
        try {
          const camera = globe.camera() as THREE.PerspectiveCamera;
          const dist = camera.position.distanceTo(controls.target);
          const nd = dist / GLOBE_RADIUS;
          controls.rotateSpeed = Math.max(0.05, nd * 0.3);
          controls.zoomSpeed = Math.max(0.1, Math.sqrt(nd) * 0.5);
        } catch { /* ignore */ }
      });

      // --- Enable pan & relax constraints ---
      controls.enablePan = true;
      controls.panSpeed = 0.5;
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.minDistance = 1;
      controls.maxDistance = GLOBE_RADIUS * 25;

      // --- Expose flyTo for CameraControls buttons ---
      globe.__freeCamFlyTo = (
        toPos: THREE.Vector3,
        toTarget: THREE.Vector3,
        duration = 800,
      ) => {
        // Fetch current camera/controls fresh each time (avoid stale closures)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let ctrl: any;
        let cam: THREE.PerspectiveCamera;
        try {
          ctrl = globe.controls();
          cam = globe.camera() as THREE.PerspectiveCamera;
          if (!ctrl) return;
        } catch {
          return;
        }

        transitionRef.current = {
          startTime: performance.now(),
          duration,
          fromPos: cam.position.clone(),
          toPos,
          fromTarget: ctrl.target.clone(),
          toTarget,
        };
      };
    }, 300);

    return () => clearInterval(timer);
  }, [globeRef]);

  // 2. Double-click to set new orbit pivot
  useEffect(() => {
    const timer = setInterval(() => {
      const globe = globeRef.current;
      if (!globe) return;

      let canvas: HTMLCanvasElement;
      try {
        const renderer = globe.renderer();
        if (!renderer) return;
        canvas = renderer.domElement as HTMLCanvasElement;
        if (!canvas) return;
      } catch {
        return;
      }

      clearInterval(timer);

      const handleDblClick = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1,
        );

        let camera: THREE.PerspectiveCamera;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let controls: any;
        try {
          camera = globe.camera() as THREE.PerspectiveCamera;
          controls = globe.controls();
          if (!controls) return;
        } catch {
          return;
        }

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        // Intersect with globe sphere
        const sphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), GLOBE_RADIUS);
        const hit = new THREE.Vector3();
        if (!raycaster.ray.intersectSphere(sphere, hit)) return;

        // Stop any follow mode
        useSatelliteStore.getState().setCameraFollow('none');

        // Smooth transition: keep camera where it is, move target to hit point
        transitionRef.current = {
          startTime: performance.now(),
          duration: 400,
          fromPos: camera.position.clone(),
          toPos: camera.position.clone(),
          fromTarget: controls.target.clone(),
          toTarget: hit.clone(),
        };
      };

      canvas.addEventListener('dblclick', handleDblClick);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (canvas as any).__dblHandler = handleDblClick;
    }, 500);

    return () => {
      clearInterval(timer);
      try {
        const canvas = globeRef.current?.renderer()?.domElement;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (canvas?.__dblHandler) {
          canvas.removeEventListener('dblclick', (canvas as any).__dblHandler);
        }
      } catch { /* ignore */ }
    };
  }, [globeRef]);

  // 3. Animation loop: transitions, follow modes, adaptive near plane
  useEffect(() => {
    function tick() {
      rafRef.current = requestAnimationFrame(tick);

      const globe = globeRef.current;
      if (!globe || !patchedRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let controls: any;
      let camera: THREE.PerspectiveCamera;
      try {
        controls = globe.controls();
        camera = globe.camera() as THREE.PerspectiveCamera;
        if (!controls) return;
      } catch {
        return;
      }

      // --- Reset zoom constraints (sat-pov restricts them to d±2) ---
      controls.minDistance = 1;
      controls.maxDistance = GLOBE_RADIUS * 25;

      // --- Adaptive near plane (only update when value changes) ---
      const alt = camera.position.length() - GLOBE_RADIUS;
      const newNear = alt < GLOBE_RADIUS * 0.05 ? 0.01
                    : alt < GLOBE_RADIUS * 0.2 ? 0.05
                    : 0.1;
      if (camera.near !== newNear) {
        camera.near = newNear;
        camera.updateProjectionMatrix();
      }

      // --- Smooth transition ---
      const tr = transitionRef.current;
      if (tr) {
        const t = Math.min((performance.now() - tr.startTime) / tr.duration, 1);
        const e = easeInOutQuad(t);
        camera.position.lerpVectors(tr.fromPos, tr.toPos, e);
        controls.target.lerpVectors(tr.fromTarget, tr.toTarget, e);
        if (t >= 1) {
          transitionRef.current = null;
          prevSatPosRef.current.copy(tr.toTarget);
        }
        controls.update();
        return;
      }

      // --- Follow modes ---
      const store = useSatelliteStore.getState();

      if (store.cameraFollow === 'none') {
        controls.update();
        return;
      }

      // Auto-stop if satellite deselected
      if (store.selectedSatId === null) {
        store.setCameraFollow('none');
        controls.update();
        return;
      }

      const pos = store.positions.get(store.selectedSatId)
        ?? store.massPositions.get(store.selectedSatId);
      if (!pos) { controls.update(); return; }

      const relAlt = pos.alt / EARTH_RADIUS_KM;
      const satPos = polar2Cartesian(pos.lat, pos.lng, relAlt);

      if (store.cameraFollow === 'track') {
        // Delta-based: shift camera + target by satellite movement
        if (prevSatPosRef.current.lengthSq() < 0.01) {
          prevSatPosRef.current.copy(satPos);
          controls.target.copy(satPos);
        } else {
          const delta = satPos.clone().sub(prevSatPosRef.current);
          if (delta.lengthSq() > 0.000001) {
            camera.position.add(delta);
            controls.target.copy(satPos);
            prevSatPosRef.current.copy(satPos);
          }
        }
      } else if (store.cameraFollow === 'sat-pov') {
        // Camera locked at satellite, looking at Earth center
        camera.position.copy(satPos);
        controls.target.set(0, 0, 0);
        const d = satPos.length();
        controls.minDistance = d - 2;
        controls.maxDistance = d + 2;
      }

      controls.update();
    }

    tick();
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [globeRef]);
}
