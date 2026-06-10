'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLOBE_RADIUS, sunPosition3D, moonPosition3D } from '@/lib/globe-math';
import { getSunLatLng } from '@/lib/sun';
import { getMoonLatLng } from '@/lib/moon';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GlobeRef = React.MutableRefObject<any>;

/**
 * Sets up sun-based directional lighting, sun/moon visual spheres,
 * and updates their positions every 60 seconds.
 *
 * Returns sunPosRef (THREE.Vector3) so other systems (satellite panel
 * orientation) can read the current sun direction.
 */
export function useGlobeLighting(globeRef: GlobeRef) {
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const sunMeshRef = useRef<THREE.Mesh | null>(null);
  const moonMeshRef = useRef<THREE.Mesh | null>(null);

  const initSun = getSunLatLng(new Date());
  const sunPosRef = useRef(sunPosition3D(initSun.lat, initSun.lng));

  const initMoon = getMoonLatLng(new Date());
  const moonPosRef = useRef(moonPosition3D(initMoon.lat, initMoon.lng));

  // Setup sun-based lighting: replace default lights with sun-positioned DirectionalLight
  useEffect(() => {
    const timer = setInterval(() => {
      const globe = globeRef.current;
      if (!globe) return;
      let scene: THREE.Scene;
      try { scene = globe.scene(); } catch { return; }
      if (!scene) return;
      clearInterval(timer);

      const sunPos = sunPosRef.current;

      // Replace default lights — low ambient for visible day/night terminator
      const ambient = new THREE.AmbientLight(0x667788, Math.PI * 0.6);
      const sunLight = new THREE.DirectionalLight(0xfff8e8, Math.PI * 1.2);
      sunLight.position.copy(sunPos);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globe as any).lights([ambient, sunLight]);
      } catch {
        const old = scene.children.filter(
          (c: THREE.Object3D) => c instanceof THREE.DirectionalLight || c instanceof THREE.AmbientLight,
        );
        for (const l of old) scene.remove(l);
        scene.add(ambient);
        scene.add(sunLight);
      }
      sunLightRef.current = sunLight;

      // Extend camera far plane so distant sun/moon spheres are visible
      try {
        const cam = globe.camera() as THREE.PerspectiveCamera;
        if (cam.far < 100000) {
          cam.far = 100000;
          cam.updateProjectionMatrix();
        }
      } catch { /* camera not ready */ }

      // Sun visual sphere with glow
      const sunGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 0.6, 32, 32);
      const sunMat = new THREE.MeshBasicMaterial({ color: 0xffee88 });
      const sunMesh = new THREE.Mesh(sunGeo, sunMat);
      sunMesh.position.copy(sunPos);
      scene.add(sunMesh);
      sunMeshRef.current = sunMesh;

      const glowGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.8, 32, 32);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xffdd66,
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      sunMesh.add(glowMesh);

      // Moon visual sphere
      const moonGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 0.12, 16, 16);
      const moonMat = new THREE.MeshBasicMaterial({ color: 0xd4d4d4 });
      const moonMesh = new THREE.Mesh(moonGeo, moonMat);
      moonMesh.position.copy(moonPosRef.current);
      scene.add(moonMesh);
      moonMeshRef.current = moonMesh;
    }, 300);

    return () => clearInterval(timer);
  }, [globeRef]);

  // Update sun & moon positions every 60s
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const { lat, lng } = getSunLatLng(now);
      const pos = sunPosition3D(lat, lng);
      sunPosRef.current.copy(pos);
      if (sunLightRef.current) sunLightRef.current.position.copy(pos);
      if (sunMeshRef.current) sunMeshRef.current.position.copy(pos);

      const moonLL = getMoonLatLng(now);
      const moonPos = moonPosition3D(moonLL.lat, moonLL.lng);
      moonPosRef.current.copy(moonPos);
      if (moonMeshRef.current) moonMeshRef.current.position.copy(moonPos);
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  return { sunPosRef };
}
