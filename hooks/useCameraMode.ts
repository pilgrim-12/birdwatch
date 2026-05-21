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
 * Strategy: globe.gl calls `controls.target.setScalar(0)` on every user
 * interaction to force the orbit center back to Earth's origin. We override
 * that single method so the reset becomes a no-op. Everything else (pan,
 * orbit, zoom) then works naturally through Three.js OrbitControls.
 */
export function useCameraMode(globeRef: GlobeRef): void {
  const patchedRef = useRef(false);
  const transitionRef = useRef<Transition | null>(null);
  const prevSatPosRef = useRef(new THREE.Vector3());
  const rafRef = useRef<number | null>(null);

  // 1. Patch controls once they're ready
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

      // --- Enable pan & relax constraints ---
      controls.enablePan = true;
      controls.panSpeed = 0.5;
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.minDistance = 1;
      controls.maxDistance = GLOBE_RADIUS * 12;
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

  // 3. Animation loop: handle transitions, follow modes, adaptive speed
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

      // --- Adaptive speed ---
      const dist = camera.position.distanceTo(controls.target);
      const nd = dist / GLOBE_RADIUS;
      controls.rotateSpeed = Math.max(0.05, nd * 0.3);
      controls.zoomSpeed = Math.max(0.1, Math.sqrt(nd) * 0.5);

      // --- Adaptive near plane ---
      const alt = camera.position.length() - GLOBE_RADIUS;
      camera.near = alt < GLOBE_RADIUS * 0.05 ? 0.01
                   : alt < GLOBE_RADIUS * 0.2 ? 0.05
                   : 0.1;
      camera.updateProjectionMatrix();

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
        // We blocked setScalar(0) so set target directly:
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

  // 4. Expose flyTo for preset buttons
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    globe.__freeCamFlyTo = (
      toPos: THREE.Vector3,
      toTarget: THREE.Vector3,
      duration = 800,
    ) => {
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

      transitionRef.current = {
        startTime: performance.now(),
        duration,
        fromPos: camera.position.clone(),
        toPos,
        fromTarget: controls.target.clone(),
        toTarget,
      };
    };
  }, [globeRef]);
}
