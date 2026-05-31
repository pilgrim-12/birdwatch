'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { computeOrbitPath } from '@/lib/orbit';
import { EARTH_RADIUS_KM, GROUP_COLORS } from '@/lib/constants';
import type { SatelliteGroup } from '@/lib/constants';
import { polar2Cartesian, GLOBE_RADIUS } from '@/lib/globe-math';
import { useCameraMode } from '@/hooks/useCameraMode';
import { CameraControls } from './CameraControls';

const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

interface PointData {
  id: number;
  name: string;
  lat: number;
  lng: number;
  alt: number;
  velocity: number;
  selected: boolean;
  group: string;
  color: string;
}

interface CombinedPath {
  pathId: string;
  type: 'orbit' | 'beam' | 'look-line';
  points: { lat: number; lng: number; alt: number }[];
  selected: boolean;
  color: string;
}

/** Great-circle distance in radians between two lat/lng points */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface MassLayerDatum {
  id: string;
  positions: Map<number, { lat: number; lng: number; alt: number; velocity: number }>;
}

export default function GlobeView() {
  const satellites = useSatelliteStore((s) => s.satellites);
  const positions = useSatelliteStore((s) => s.positions);
  const selectSatellite = useSatelliteStore((s) => s.selectSatellite);
  const selectedSatId = useSatelliteStore((s) => s.selectedSatId);
  const observer = useSatelliteStore((s) => s.observer);
  const setObserver = useSatelliteStore((s) => s.setObserver);
  const showTrajectories = useSatelliteStore((s) => s.showTrajectories);
  const showLabels = useSatelliteStore((s) => s.showLabels);
  const showBeams = useSatelliteStore((s) => s.showBeams);
  const showLookLine = useSatelliteStore((s) => s.showLookLine);
  const nightMode = useSatelliteStore((s) => s.nightMode);
  const beamOpacity = useSatelliteStore((s) => s.beamOpacity);
  const beamWidth = useSatelliteStore((s) => s.beamWidth);
  const beamSpeed = useSatelliteStore((s) => s.beamSpeed);
  const cameraFollow = useSatelliteStore((s) => s.cameraFollow);

  // Mass group (Starlink) state
  const massPositions = useSatelliteStore((s) => s.massPositions);

  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Camera mode management hook
  useCameraMode(globeRef);

  // Ref for current label positions — updated below after htmlLabelsData is computed
  const labelPosRef = useRef<Map<number, { lat: number; lng: number; alt: number }>>(new Map());

  // Label element refs — populated directly from htmlElement callback
  const labelElsRef = useRef<Map<number, HTMLElement>>(new Map());

  // Stable map of PointData — reuses same object references so three-globe
  // doesn't recreate Three.js meshes on every position update
  const stablePointsMapRef = useRef<Map<number, PointData>>(new Map());

  // Interpolation keyframes for smooth 60fps motion between SGP4 updates
  const interpRef = useRef<{
    prev: Map<number, { lat: number; lng: number; alt: number }>;
    curr: Map<number, { lat: number; lng: number; alt: number }>;
    time: number;
    interval: number;
  }>({ prev: new Map(), curr: new Map(), time: 0, interval: 250 });

  // Main 60fps loop: smooth position interpolation + label occlusion
  useEffect(() => {
    const ray = new THREE.Ray();
    const sphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), GLOBE_RADIUS);
    const hitPoint = new THREE.Vector3();
    const satVec = new THREE.Vector3();
    let raf: number;

    function interpLerp(
      prev: Map<number, { lat: number; lng: number; alt: number }>,
      curr: Map<number, { lat: number; lng: number; alt: number }>,
      id: number,
      t: number,
    ): { lat: number; lng: number; alt: number } | null {
      const pa = prev.get(id);
      const pb = curr.get(id);
      if (!pa || !pb) return pb ?? pa ?? null;
      let dLng = pb.lng - pa.lng;
      if (dLng > 180) dLng -= 360;
      if (dLng < -180) dLng += 360;
      return {
        lat: pa.lat + (pb.lat - pa.lat) * t,
        lng: pa.lng + dLng * t,
        alt: pa.alt + (pb.alt - pa.alt) * t,
      };
    }

    function tick() {
      raf = requestAnimationFrame(tick);
      const globe = globeRef.current;
      if (!globe) return;

      // --- Smooth position interpolation for satellite 3D models ---
      const { prev, curr, time, interval } = interpRef.current;
      const hasKeyframes = curr.size > 0 && prev.size > 0;
      const now = performance.now();
      const t = hasKeyframes ? Math.min((now - time) / interval, 1.5) : 0;

      if (hasKeyframes) {
        stablePointsMapRef.current.forEach((point) => {
          const interp = interpLerp(prev, curr, point.id, t);
          if (!interp) return;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const container = (point as any).__threeObj;
          if (container) {
            polar2Cartesian(interp.lat, interp.lng, interp.alt, satVec);
            container.position.copy(satVec);
          }
        });
      }

      // --- Label occlusion + distance scaling ---
      if (!useSatelliteStore.getState().showLabels) return;

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
          // Scale font by distance to camera
          const distToSat = camPos.distanceTo(satVec);
          const baseFontSize = el.style.fontWeight === '600' ? 11 : 9;
          const scale = Math.max(0.4, Math.min(2.0, 200 / distToSat));
          el.style.fontSize = `${Math.round(baseFontSize * scale)}px`;
        }
      });
    }

    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  // Counter that increments every 30s to force orbit path refresh
  const [orbitEpoch, setOrbitEpoch] = useState(0);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Apply max anisotropic filtering to globe texture for sharp zoom quality
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    // Texture loads asynchronously — poll until it's ready
    const timer = setInterval(() => {
      try {
        const renderer = globe.renderer();
        const material = globe.globeMaterial();
        if (material?.map) {
          const maxAniso = renderer.capabilities.getMaxAnisotropy();
          material.map.anisotropy = maxAniso;
          material.map.needsUpdate = true;
          clearInterval(timer);
        }
      } catch {
        // Globe not ready yet
      }
    }, 500);

    return () => clearInterval(timer);
  }, [nightMode]); // re-apply when texture changes (night/day)

  // OrbitControls constraints are managed by useCameraMode hook (free camera)

  // Auto-fly camera to selected satellite (skip when in follow mode)
  const prevSelectedRef = useRef<number | null>(null);
  const hasFlewRef = useRef(false);
  useEffect(() => {
    if (cameraFollow !== 'none') return;

    if (selectedSatId === null) {
      prevSelectedRef.current = null;
      hasFlewRef.current = false;
      return;
    }
    if (selectedSatId !== prevSelectedRef.current) {
      prevSelectedRef.current = selectedSatId;
      hasFlewRef.current = false;
    }
    if (hasFlewRef.current) return;

    const pos = positions.get(selectedSatId) ?? massPositions.get(selectedSatId);
    if (!pos || !globeRef.current) return;

    hasFlewRef.current = true;

    // Use free camera flyTo if available, else fallback to pointOfView
    const relAlt = pos.alt / EARTH_RADIUS_KM;
    const satPos3D = polar2Cartesian(pos.lat, pos.lng, relAlt);
    const dirFromCenter = satPos3D.clone().normalize();
    const camDist = Math.max(GLOBE_RADIUS * 0.3, satPos3D.length() * 0.3);
    const endCamPos = satPos3D.clone().add(dirFromCenter.multiplyScalar(camDist));

    if (globeRef.current.__freeCamFlyTo) {
      globeRef.current.__freeCamFlyTo(endCamPos, satPos3D, 800);
    } else {
      const current = globeRef.current.pointOfView();
      globeRef.current.pointOfView(
        { lat: pos.lat, lng: pos.lng, altitude: Math.min(current?.altitude ?? 1.5, 1.5) },
        800,
      );
    }
  }, [selectedSatId, positions, massPositions, cameraFollow]);

  // Refresh orbit trails every 30s so the trail stays attached to the satellite
  useEffect(() => {
    const interval = setInterval(() => setOrbitEpoch((n) => n + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Propagation loops are in hooks/usePropagation.ts (called from page.tsx)

  // Orbit trail cache — avoids recomputing on re-renders within the same epoch.
  // Cleared on each epoch tick (30s) since trails are time-dependent.
  const orbitCacheRef = useRef<{ epoch: number; data: Map<string, { lat: number; lng: number; alt: number }[]> }>({ epoch: -1, data: new Map() });

  // Orbit paths — recompute when satellites change or every 30s (normal satellites only)
  const orbitPathsRaw = useMemo(() => {
    // Clear cache when epoch changes (trails are time-dependent)
    if (orbitCacheRef.current.epoch !== orbitEpoch) {
      orbitCacheRef.current = { epoch: orbitEpoch, data: new Map() };
    }
    const cache = orbitCacheRef.current.data;

    return satellites.map((sat) => {
      const cacheKey = sat.tle.line1 + sat.tle.line2;
      // Use fewer steps for non-selected satellites (60 vs 90)
      const steps = sat.id === selectedSatId ? 90 : 60;
      let points = cache.get(cacheKey);
      if (!points) {
        points = computeOrbitPath(sat.tle, new Date(), steps);
        cache.set(cacheKey, points);
      }
      return {
        id: sat.id,
        group: sat.group,
        color: GROUP_COLORS[sat.group as SatelliteGroup] || '#00d4ff',
        points,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satellites, orbitEpoch, selectedSatId]);

  // Points data (normal satellites only) — uses stable object references so
  // three-globe reuses existing Three.js meshes instead of recreating them.
  const pointsData: PointData[] = useMemo(() => {
    const stable = stablePointsMapRef.current;
    const result: PointData[] = [];
    const activeIds = new Set<number>();

    for (const s of satellites) {
      const pos = positions.get(s.id);
      if (!pos) continue;
      activeIds.add(s.id);

      const isSelected = s.id === selectedSatId;
      const color = GROUP_COLORS[s.group as SatelliteGroup] || '#00d4ff';
      let point = stable.get(s.id);

      if (point) {
        // Mutate position on existing object — preserves __threeObj reference
        point.lat = pos.lat;
        point.lng = pos.lng;
        point.alt = pos.alt / EARTH_RADIUS_KM;
        point.velocity = pos.velocity;
        // When selection changes, create a fresh object so three-globe recreates the model
        if (point.selected !== isSelected) {
          point = {
            id: s.id, name: s.name,
            lat: pos.lat, lng: pos.lng, alt: pos.alt / EARTH_RADIUS_KM,
            velocity: pos.velocity, selected: isSelected,
            group: s.group, color,
          };
          stable.set(s.id, point);
        }
      } else {
        point = {
          id: s.id, name: s.name,
          lat: pos.lat, lng: pos.lng, alt: pos.alt / EARTH_RADIUS_KM,
          velocity: pos.velocity, selected: isSelected,
          group: s.group, color,
        };
        stable.set(s.id, point);
      }
      result.push(point);
    }

    // Remove stale entries for satellites no longer loaded
    for (const id of stable.keys()) {
      if (!activeIds.has(id)) stable.delete(id);
    }

    return result;
  }, [satellites, positions, selectedSatId]);

  // Update interpolation keyframes whenever positions change
  useEffect(() => {
    const newCurr = new Map<number, { lat: number; lng: number; alt: number }>();
    positions.forEach((pos, id) => {
      newCurr.set(id, { lat: pos.lat, lng: pos.lng, alt: pos.alt / EARTH_RADIUS_KM });
    });
    const old = interpRef.current;
    interpRef.current = {
      prev: old.curr.size > 0 ? old.curr : newCurr,
      curr: newCurr,
      time: performance.now(),
      interval: 250,
    };
  }, [positions]);

  // Combined paths: orbit trajectories + scan beams (normal satellites only, not mass)
  const allPaths: CombinedPath[] = useMemo(() => {
    const paths: CombinedPath[] = [];

    // Orbit trajectories: all when toggle is on, or just selected satellite
    for (const raw of orbitPathsRaw) {
      const isSelected = raw.id === selectedSatId;
      if (showTrajectories || isSelected) {
        paths.push({
          pathId: `orbit-${raw.id}`,
          type: 'orbit',
          points: raw.points,
          selected: isSelected,
          color: raw.color,
        });
      }
    }

    // Beams: lines from satellite to ground
    if (showBeams) {
      for (const p of pointsData) {
        paths.push({
          pathId: `beam-${p.id}`,
          type: 'beam',
          points: [
            { lat: p.lat, lng: p.lng, alt: p.alt },
            { lat: p.lat, lng: p.lng, alt: 0 },
          ],
          selected: p.selected,
          color: p.color,
        });
      }
    }

    // Look-line: perpendicular from observer to closest point on selected satellite's orbit
    if (showLookLine && observer && selectedSatId !== null) {
      const selectedOrbit = orbitPathsRaw.find((o) => o.id === selectedSatId);
      if (selectedOrbit && selectedOrbit.points.length > 0) {
        let minDist = Infinity;
        let closest = selectedOrbit.points[0];
        for (const pt of selectedOrbit.points) {
          const d = haversineDistance(observer.lat, observer.lng, pt.lat, pt.lng);
          if (d < minDist) { minDist = d; closest = pt; }
        }
        paths.push({
          pathId: 'look-line',
          type: 'look-line',
          points: [
            { lat: observer.lat, lng: observer.lng, alt: 0 },
            { lat: closest.lat, lng: closest.lng, alt: closest.alt },
          ],
          selected: true,
          color: '#ff9800',
        });
      }
    }

    return paths;
  }, [showTrajectories, showBeams, showLookLine, orbitPathsRaw, selectedSatId, pointsData, observer]);

  // HTML labels for satellites on the globe
  const htmlLabelsData = useMemo(() => {
    if (!showLabels) return [];
    return pointsData.map((p) => ({
      id: p.id,
      lat: p.lat,
      lng: p.lng,
      alt: p.alt + 0.015,
      name: p.name,
      color: p.color,
      selected: p.id === selectedSatId,
    }));
  }, [showLabels, selectedSatId, pointsData]);

  // Sync label positions ref for occlusion check
  useEffect(() => {
    const m = new Map<number, { lat: number; lng: number; alt: number }>();
    for (const l of htmlLabelsData) {
      m.set(l.id, { lat: l.lat, lng: l.lng, alt: l.alt });
    }
    labelPosRef.current = m;
  }, [htmlLabelsData]);

  // Observer ring
  const ringsData = useMemo(() => {
    if (!observer) return [];
    return [{ lat: observer.lat, lng: observer.lng }];
  }, [observer]);

  // --- Mass group (Starlink) InstancedMesh via customLayerData ---
  const customLayerData: MassLayerDatum[] = useMemo(() => {
    if (massPositions.size === 0) return [];
    return [{ id: 'mass-constellation', positions: massPositions }];
  }, [massPositions]);

  // Cached geometries & materials for satellite 3D models (body + solar panels + antenna)
  const bodyGeoRef = useRef(new THREE.BoxGeometry(1.0, 0.6, 0.6));
  const panelGeoRef = useRef(new THREE.BoxGeometry(1.6, 0.05, 0.8));
  const antennaGeoRef = useRef(new THREE.ConeGeometry(0.2, 0.5, 6));
  const selectedBodyGeoRef = useRef(new THREE.BoxGeometry(1.6, 1.0, 1.0));
  const selectedPanelGeoRef = useRef(new THREE.BoxGeometry(2.6, 0.08, 1.3));
  const selectedAntennaGeoRef = useRef(new THREE.ConeGeometry(0.35, 0.8, 6));
  const panelMatRef = useRef(new THREE.MeshBasicMaterial({ color: 0x1a237e }));
  const selectedPanelMatRef = useRef(new THREE.MeshBasicMaterial({ color: 0x3949ab }));
  const materialCacheRef = useRef(new Map<string, THREE.MeshBasicMaterial>());
  const getMaterial = useCallback((color: string | number) => {
    const key = String(color);
    let mat = materialCacheRef.current.get(key);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({ color });
      materialCacheRef.current.set(key, mat);
    }
    return mat;
  }, []);

  const createSatelliteModel = useCallback((color: string | number, selected: boolean) => {
    const group = new THREE.Group();
    const bGeo = selected ? selectedBodyGeoRef.current : bodyGeoRef.current;
    const pGeo = selected ? selectedPanelGeoRef.current : panelGeoRef.current;
    const aGeo = selected ? selectedAntennaGeoRef.current : antennaGeoRef.current;
    const bodyMat = getMaterial(color);
    const pMat = selected ? selectedPanelMatRef.current : panelMatRef.current;

    // Main bus (body)
    const body = new THREE.Mesh(bGeo, bodyMat);
    group.add(body);

    // Solar panel — left
    const panelL = new THREE.Mesh(pGeo, pMat);
    panelL.position.x = selected ? -2.1 : -1.3;
    group.add(panelL);

    // Solar panel — right
    const panelR = new THREE.Mesh(pGeo, pMat);
    panelR.position.x = selected ? 2.1 : 1.3;
    group.add(panelR);

    // Antenna dish on top
    const antenna = new THREE.Mesh(aGeo, bodyMat);
    antenna.position.y = selected ? 0.7 : 0.45;
    group.add(antenna);

    return group;
  }, [getMaterial]);

  /** Space station model: long truss with 4 panel pairs + central modules */
  const createStationModel = useCallback((color: string | number, selected: boolean) => {
    const group = new THREE.Group();
    const s = selected ? 2.0 : 1.0; // scale factor
    const bodyMat = getMaterial(color);
    const pMat = selected ? selectedPanelMatRef.current : panelMatRef.current;
    const radiatorMat = getMaterial(0xcccccc);

    // Central module cluster (3 connected modules)
    const mainModule = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * s, 0.5 * s, 1.8 * s, 8), bodyMat);
    mainModule.rotation.z = Math.PI / 2;
    group.add(mainModule);

    const moduleL = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * s, 0.35 * s, 1.2 * s, 8), bodyMat);
    moduleL.rotation.z = Math.PI / 2;
    moduleL.position.y = 0.6 * s;
    group.add(moduleL);

    const moduleR = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * s, 0.35 * s, 1.2 * s, 8), bodyMat);
    moduleR.rotation.z = Math.PI / 2;
    moduleR.position.y = -0.6 * s;
    group.add(moduleR);

    // Truss (long horizontal beam)
    const truss = new THREE.Mesh(new THREE.BoxGeometry(8.0 * s, 0.15 * s, 0.15 * s), radiatorMat);
    group.add(truss);

    // 4 pairs of solar panels along the truss
    const panelPositions = [-3.2, -1.6, 1.6, 3.2];
    for (const px of panelPositions) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.15 * s, 0.05 * s, 2.0 * s), pMat);
      panel.position.set(px * s, 0.1 * s, 0);
      group.add(panel);
    }

    // Radiator panels (smaller, white, between panel pairs)
    for (const rx of [-2.4, 2.4]) {
      const radiator = new THREE.Mesh(new THREE.BoxGeometry(0.8 * s, 0.03 * s, 0.6 * s), radiatorMat);
      radiator.position.set(rx * s, -0.15 * s, 0);
      group.add(radiator);
    }

    return group;
  }, [getMaterial]);

  const starlinkMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const dummyObj = useRef(new THREE.Object3D());

  const createMassMesh = useCallback(() => {
    const geo = new THREE.BoxGeometry(0.8, 0.15, 0.4); // flat satellite shape for performance
    const mat = new THREE.MeshBasicMaterial({
      color: GROUP_COLORS.starlink,
      transparent: true,
      opacity: 0.8,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, 11000);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.count = 0;
    starlinkMeshRef.current = mesh;
    return mesh;
  }, []);

  const updateMassMesh = useCallback(
    (obj: object) => {
      const mesh = obj as THREE.InstancedMesh;
      if (massPositions.size === 0) {
        mesh.count = 0;
        return;
      }

      let idx = 0;
      const dummy = dummyObj.current;

      massPositions.forEach((pos) => {
        const relAlt = pos.alt / EARTH_RADIUS_KM;
        const vec = polar2Cartesian(pos.lat, pos.lng, relAlt);
        dummy.position.copy(vec);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
        idx++;
      });

      mesh.count = idx;
      mesh.instanceMatrix.needsUpdate = true;
    },
    [massPositions],
  );

  const handlePointClick = useCallback(
    (point: object) => {
      const p = point as PointData;
      selectSatellite(p.id);
    },
    [selectSatellite],
  );

  const handleGlobeClick = useCallback(
    ({ lat, lng }: { lat: number; lng: number }) => {
      setObserver({ lat, lng, alt: 0 });
    },
    [setObserver],
  );

  return (
    <div ref={containerRef} className="w-full h-full relative z-0">
      <CameraControls globeRef={globeRef} />
      {dimensions.width > 0 && (
        <Globe
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          globeImageUrl={
            nightMode
              ? '/earth-night-4k.jpg'
              : '/earth-day-4k.jpg'
          }
          backgroundImageUrl={
            nightMode
              ? '/night-sky.png'
              : undefined
          }
          // Satellite 3D spheres (colored by group) — normal satellites only
          objectsData={pointsData}
          objectLat="lat"
          objectLng="lng"
          objectAltitude="alt"
          objectLabel="name"
          objectThreeObject={(d: object) => {
            const point = d as PointData;
            const c = point.selected ? 0xffffff : point.color;
            if (point.group === 'stations') return createStationModel(c, point.selected);
            return createSatelliteModel(c, point.selected);
          }}
          onObjectClick={handlePointClick}
          // HTML tooltip label for selected satellite
          htmlElementsData={htmlLabelsData}
          htmlLat="lat"
          htmlLng="lng"
          htmlAltitude="alt"
          htmlElement={(d: object) => {
            const data = d as { id: number; name: string; color: string; selected: boolean; lat: number; lng: number; alt: number };
            const el = document.createElement('div');
            el.textContent = data.name;
            el.setAttribute('data-sat-id', String(data.id));
            el.style.cssText = data.selected
              ? `color:#fff;font-size:11px;font-family:system-ui,sans-serif;background:rgba(0,0,0,0.85);padding:2px 8px;border-radius:4px;white-space:nowrap;pointer-events:none;transform:translateY(-18px);border:1px solid ${data.color};font-weight:600;transition:opacity 0.15s;`
              : `color:#ccc;font-size:9px;font-family:system-ui,sans-serif;background:rgba(0,0,0,0.5);padding:1px 5px;border-radius:3px;white-space:nowrap;pointer-events:none;transform:translateY(-14px);transition:opacity 0.15s;`;
            labelElsRef.current.set(data.id, el);
            return el;
          }}
          htmlTransitionDuration={0}
          // Combined paths: orbit trajectories + scan beams
          pathsData={allPaths}
          pathId="pathId"
          pathPoints="points"
          pathPointLat={(p: object) => (p as { lat: number }).lat}
          pathPointLng={(p: object) => (p as { lng: number }).lng}
          pathPointAlt={(p: object) => (p as { alt: number }).alt}
          pathColor={(d: object) => {
            const path = d as CombinedPath;
            const hex = path.color;
            if (path.type === 'look-line') return `${hex}FF`;
            if (path.type === 'beam') {
              const selectedAlpha = Math.round((beamOpacity / 100) * 255).toString(16).padStart(2, '0');
              const normalAlpha = Math.round((beamOpacity / 100) * 180).toString(16).padStart(2, '0');
              return path.selected ? `${hex}${selectedAlpha}` : `${hex}${normalAlpha}`;
            }
            return path.selected ? `${hex}FF` : `${hex}90`;
          }}
          pathStroke={(d: object) => {
            const path = d as CombinedPath;
            if (path.type === 'look-line') return 1.5;
            if (path.type === 'beam') return path.selected ? beamWidth * 1.5 : beamWidth * 0.5;
            return path.selected ? 2 : 0.8;
          }}
          pathDashLength={(d: object) => {
            const path = d as CombinedPath;
            if (path.type === 'look-line') return 0;
            if (path.type === 'beam') return 0.3;
            return path.selected ? 0 : 1;
          }}
          pathDashGap={(d: object) => {
            const path = d as CombinedPath;
            if (path.type === 'look-line') return 0;
            if (path.type === 'beam') return 0.7;
            return path.selected ? 0 : 0.5;
          }}
          pathDashAnimateTime={(d: object) => {
            const path = d as CombinedPath;
            if (path.type === 'look-line') return 0;
            if (path.type === 'beam') {
              const speedMap = [0, 4000, 2000, 800];
              return speedMap[beamSpeed] ?? 2000;
            }
            return 0;
          }}
          pathTransitionDuration={0}
          // Mass group (Starlink) — rendered as InstancedMesh (single draw call)
          customLayerData={customLayerData}
          customThreeObject={createMassMesh}
          customThreeObjectUpdate={updateMassMesh}
          // Observer ring
          ringsData={ringsData}
          ringLat="lat"
          ringLng="lng"
          ringColor={() => '#ff9800'}
          ringMaxRadius={3}
          ringPropagationSpeed={2}
          ringRepeatPeriod={1000}
          // Globe interaction
          onGlobeClick={handleGlobeClick}
          animateIn={false}
        />
      )}
    </div>
  );
}
