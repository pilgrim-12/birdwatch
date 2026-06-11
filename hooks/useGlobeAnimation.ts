'use client';

import { useEffect } from 'react';
import * as THREE from 'three';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { polar2Cartesian, GLOBE_RADIUS } from '@/lib/globe-math';
import type { GlobeRef } from '@/types/globe';

interface PointData {
  id: number;
  lat: number;
  lng: number;
  alt: number;
}

/**
 * 60fps animation loop that handles:
 * 1. Satellite model orientation (body toward Earth, panels toward sun)
 * 2. Label/flag occlusion (hide labels behind the globe)
 * 3. Distance-based label scaling
 */
export function useGlobeAnimation(
  globeRef: GlobeRef,
  sunPosRef: React.MutableRefObject<THREE.Vector3>,
  stablePointsMapRef: React.MutableRefObject<Map<number, PointData>>,
  satModelMapRef: React.MutableRefObject<Map<number, THREE.Group>>,
  labelPosRef: React.MutableRefObject<Map<number, { lat: number; lng: number; alt: number }>>,
  labelElsRef: React.MutableRefObject<Map<number, HTMLElement>>,
) {
  useEffect(() => {
    const ray = new THREE.Ray();
    const sphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), GLOBE_RADIUS);
    const hitPoint = new THREE.Vector3();
    const satVec = new THREE.Vector3();
    const defaultUp = new THREE.Vector3(0, 1, 0);
    const toEarth = new THREE.Vector3();
    const toSun = new THREE.Vector3();
    const sunLocal = new THREE.Vector3();
    const invQuat = new THREE.Quaternion();
    let raf: number;

    function tick() {
      raf = requestAnimationFrame(tick);
      const globe = globeRef.current;
      if (!globe) return;

      // --- Orient satellite models: body toward Earth, panels toward sun ---
      stablePointsMapRef.current.forEach((point) => {
        const model = satModelMapRef.current.get(point.id);
        if (!model || !model.parent) return;

        model.parent.getWorldPosition(satVec);

        // Orient entire model so antenna (+Y) points toward Earth center
        toEarth.copy(satVec).negate().normalize();
        model.quaternion.setFromUnitVectors(defaultUp, toEarth);

        // Rotate panels to track the sun
        toSun.copy(sunPosRef.current).sub(satVec).normalize();
        invQuat.copy(model.quaternion).invert();
        sunLocal.copy(toSun).applyQuaternion(invQuat);
        const panelAngle = Math.atan2(sunLocal.z, sunLocal.y);

        for (const child of model.children) {
          if (child.userData.isPanel) {
            child.rotation.x = panelAngle;
          }
        }
      });

      // --- Label/flag occlusion + distance scaling ---
      const _state = useSatelliteStore.getState();
      if (!_state.showLabels && !_state.showFlags) return;

      let camera: THREE.PerspectiveCamera;
      try {
        camera = globe.camera() as THREE.PerspectiveCamera;
      } catch {
        return;
      }

      const camPos = camera.position;

      labelElsRef.current.forEach((el, id) => {
        const pos = labelPosRef.current.get(id);
        if (!pos) { el.style.opacity = '0'; return; }

        polar2Cartesian(pos.lat, pos.lng, pos.alt + 0.015, satVec);

        // Occlusion: hide labels behind the globe
        ray.origin.copy(camPos);
        ray.direction.subVectors(satVec, camPos).normalize();
        const hit = ray.intersectSphere(sphere, hitPoint);
        const occluded = hit && camPos.distanceTo(hitPoint) < camPos.distanceTo(satVec) - 0.5;

        if (occluded) {
          el.style.opacity = '0';
        } else {
          el.style.opacity = '1';
          const distToSat = camPos.distanceTo(satVec);
          const baseFontSize = el.style.fontWeight === '600' ? 11 : 9;
          const scale = Math.max(0.4, Math.min(2.0, 200 / distToSat));
          el.style.fontSize = `${Math.round(baseFontSize * scale)}px`;
        }
      });
    }

    tick();
    return () => cancelAnimationFrame(raf);
  }, [globeRef, sunPosRef, stablePointsMapRef, satModelMapRef, labelPosRef, labelElsRef]);
}
