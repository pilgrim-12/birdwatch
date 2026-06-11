'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { computeOrbitPath } from '@/lib/orbit';
import { EARTH_RADIUS_KM, GROUP_COLORS, GROUP_INFO } from '@/lib/constants';
import type { SatelliteGroup } from '@/lib/constants';
import { getCountryIsoCodes } from '@/lib/countryFlags';
import { polar2Cartesian, GLOBE_RADIUS } from '@/lib/globe-math';
import { computeFootprintCircle } from '@/lib/footprint';
import { computeCPA, computeSlantRange } from '@/lib/orbitAnalysis';
import { useCameraMode } from '@/hooks/useCameraMode';
import { useGlobeLighting } from '@/hooks/useGlobeLighting';
import { useGlobeAnimation } from '@/hooks/useGlobeAnimation';
import { useSatelliteModels } from '@/hooks/useSatelliteModels';
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
  type: 'orbit' | 'beam' | 'look-line' | 'ground-line';
  points: { lat: number; lng: number; alt: number }[];
  selected: boolean;
  color: string;
}

interface MassLayerDatum {
  id: string;
  positions: Map<number, { lat: number; lng: number; alt: number; velocity: number }>;
}

interface FootprintDatum {
  coords: [number, number][];
  color: string;
}

export default function GlobeView() {
  const satellites = useSatelliteStore((s) => s.satellites);
  const positions = useSatelliteStore((s) => s.positions);
  const selectSatellite = useSatelliteStore((s) => s.selectSatellite);
  const selectedSatIds = useSatelliteStore((s) => s.selectedSatIds);
  const selectedSatId = selectedSatIds.length > 0 ? selectedSatIds[selectedSatIds.length - 1] : null;
  const observer = useSatelliteStore((s) => s.observer);
  const setObserver = useSatelliteStore((s) => s.setObserver);
  const showTrajectories = useSatelliteStore((s) => s.showTrajectories);
  const showLabels = useSatelliteStore((s) => s.showLabels);
  const showFlags = useSatelliteStore((s) => s.showFlags);
  const showBeams = useSatelliteStore((s) => s.showBeams);
  const showLookLine = useSatelliteStore((s) => s.showLookLine);
  const showGroundLine = useSatelliteStore((s) => s.showGroundLine);
  const showFootprint = useSatelliteStore((s) => s.showFootprint);
  const nightMode = useSatelliteStore((s) => s.nightMode);
  const beamOpacity = useSatelliteStore((s) => s.beamOpacity);
  const beamWidth = useSatelliteStore((s) => s.beamWidth);
  const beamSpeed = useSatelliteStore((s) => s.beamSpeed);
  const cameraFollow = useSatelliteStore((s) => s.cameraFollow);
  const massPositions = useSatelliteStore((s) => s.massPositions);

  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Extracted hooks
  useCameraMode(globeRef);
  const { sunPosRef } = useGlobeLighting(globeRef);
  const { createSatelliteModel, createStationModel } = useSatelliteModels();

  // Refs for animation + label tracking
  const labelPosRef = useRef<Map<number, { lat: number; lng: number; alt: number }>>(new Map());
  const labelElsRef = useRef<Map<number, HTMLElement>>(new Map());
  const stablePointsMapRef = useRef<Map<number, PointData>>(new Map());
  const interpRef = useRef<{
    prev: Map<number, { lat: number; lng: number; alt: number }>;
    curr: Map<number, { lat: number; lng: number; alt: number }>;
    time: number;
    interval: number;
  }>({ prev: new Map(), curr: new Map(), time: 0, interval: 250 });
  const satModelMapRef = useRef<Map<number, THREE.Group>>(new Map());

  useGlobeAnimation(globeRef, sunPosRef, stablePointsMapRef, satModelMapRef, labelPosRef, labelElsRef);

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

  // Apply max anisotropic filtering to globe texture
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    let attempts = 0;
    const timer = setInterval(() => {
      if (++attempts > 60) { clearInterval(timer); return; }
      try {
        const renderer = globe.renderer();
        const material = globe.globeMaterial();
        if (material?.map) {
          const maxAniso = renderer.capabilities.getMaxAnisotropy();
          material.map.anisotropy = maxAniso;
          material.map.needsUpdate = true;
          clearInterval(timer);
        }
      } catch { /* Globe not ready */ }
    }, 500);
    return () => clearInterval(timer);
  }, [nightMode]);

  // Auto-fly camera to selected satellite
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

  // Refresh orbit trails every 30s
  useEffect(() => {
    const interval = setInterval(() => setOrbitEpoch((n) => n + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Orbit trail cache
  const orbitCacheRef = useRef<{ epoch: number; data: Map<string, { lat: number; lng: number; alt: number }[]> }>({ epoch: -1, data: new Map() });

  const orbitPathsRaw = useMemo(() => {
    if (orbitCacheRef.current.epoch !== orbitEpoch) {
      orbitCacheRef.current = { epoch: orbitEpoch, data: new Map() };
    }
    const cache = orbitCacheRef.current.data;

    const results = satellites.map((sat) => {
      const cacheKey = sat.tle.line1 + sat.tle.line2;
      const steps = selectedSatIds.includes(sat.id) ? 90 : 60;
      let points = cache.get(cacheKey);
      if (!points) {
        points = computeOrbitPath(sat.tle, new Date(), steps);
        cache.set(cacheKey, points);
      }
      return { id: sat.id, group: sat.group, color: GROUP_COLORS[sat.group as SatelliteGroup] || '#00d4ff', points };
    });

    const resultIds = new Set(results.map((r) => r.id));
    for (const selId of selectedSatIds) {
      if (!resultIds.has(selId)) {
        const massSat = useSatelliteStore.getState().massSatellites.find((s) => s.id === selId);
        if (massSat) {
          results.push({
            id: massSat.id, group: massSat.group,
            color: GROUP_COLORS[massSat.group as SatelliteGroup] || '#00d4ff',
            points: computeOrbitPath(massSat.tle, new Date(), 90),
          });
        }
      }
    }
    return results;
  }, [satellites, orbitEpoch, selectedSatIds]);

  // Stable points data for three-globe
  const pointsData: PointData[] = useMemo(() => {
    const stable = stablePointsMapRef.current;
    const result: PointData[] = [];
    const activeIds = new Set<number>();

    for (const s of satellites) {
      const pos = positions.get(s.id);
      if (!pos) continue;
      activeIds.add(s.id);
      const isSelected = selectedSatIds.includes(s.id);
      const color = GROUP_COLORS[s.group as SatelliteGroup] || '#00d4ff';
      let point = stable.get(s.id);

      if (point) {
        point.lat = pos.lat;
        point.lng = pos.lng;
        point.alt = pos.alt / EARTH_RADIUS_KM;
        point.velocity = pos.velocity;
        if (point.selected !== isSelected) {
          point = { id: s.id, name: s.name, lat: pos.lat, lng: pos.lng, alt: pos.alt / EARTH_RADIUS_KM, velocity: pos.velocity, selected: isSelected, group: s.group, color };
          stable.set(s.id, point);
        }
      } else {
        point = { id: s.id, name: s.name, lat: pos.lat, lng: pos.lng, alt: pos.alt / EARTH_RADIUS_KM, velocity: pos.velocity, selected: isSelected, group: s.group, color };
        stable.set(s.id, point);
      }
      result.push(point);
    }

    for (const id of stable.keys()) {
      if (!activeIds.has(id)) stable.delete(id);
    }
    return result;
  }, [satellites, positions, selectedSatIds]);

  // Update interpolation keyframes
  useEffect(() => {
    const newCurr = new Map<number, { lat: number; lng: number; alt: number }>();
    positions.forEach((pos, id) => {
      newCurr.set(id, { lat: pos.lat, lng: pos.lng, alt: pos.alt / EARTH_RADIUS_KM });
    });
    const old = interpRef.current;
    interpRef.current = { prev: old.curr.size > 0 ? old.curr : newCurr, curr: newCurr, time: performance.now(), interval: 250 };
  }, [positions]);

  // CPA info — uses shared computeCPA
  const cpaInfo = useMemo(() => {
    if (!showLookLine || !observer || selectedSatId === null) return null;
    const selectedOrbit = orbitPathsRaw.find((o) => o.id === selectedSatId);
    if (!selectedOrbit || selectedOrbit.points.length === 0) return null;
    return computeCPA(observer, selectedOrbit.points);
  }, [showLookLine, observer, selectedSatId, orbitPathsRaw]);

  // Ground-line info — uses shared computeSlantRange
  const groundLineInfo = useMemo(() => {
    if (!showGroundLine || !observer || selectedSatId === null) return null;
    const pos = positions.get(selectedSatId) ?? massPositions.get(selectedSatId);
    if (!pos) return null;
    return computeSlantRange(observer, pos);
  }, [showGroundLine, observer, selectedSatId, positions, massPositions]);

  // Combined paths: orbits + beams + look-line + ground-line
  const allPaths: CombinedPath[] = useMemo(() => {
    const paths: CombinedPath[] = [];

    for (const raw of orbitPathsRaw) {
      const isSelected = selectedSatIds.includes(raw.id);
      if (showTrajectories || isSelected) {
        paths.push({ pathId: `orbit-${raw.id}`, type: 'orbit', points: raw.points, selected: isSelected, color: raw.color });
      }
    }

    if (showBeams) {
      for (const p of pointsData) {
        paths.push({ pathId: `beam-${p.id}`, type: 'beam', points: [{ lat: p.lat, lng: p.lng, alt: p.alt }, { lat: p.lat, lng: p.lng, alt: 0 }], selected: p.selected, color: p.color });
      }
    }

    if (cpaInfo && observer) {
      paths.push({ pathId: 'look-line', type: 'look-line', points: [{ lat: observer.lat, lng: observer.lng, alt: 0 }, { lat: cpaInfo.closest.lat, lng: cpaInfo.closest.lng, alt: cpaInfo.closest.alt }], selected: true, color: '#ff9800' });
    }

    if (groundLineInfo && observer) {
      paths.push({ pathId: 'ground-line', type: 'ground-line', points: [{ lat: observer.lat, lng: observer.lng, alt: 0 }, { lat: groundLineInfo.lat, lng: groundLineInfo.lng, alt: groundLineInfo.alt }], selected: true, color: '#4fc3f7' });
    }

    return paths;
  }, [showTrajectories, showBeams, orbitPathsRaw, selectedSatIds, pointsData, observer, cpaInfo, groundLineInfo]);

  // HTML labels
  const htmlLabelsData = useMemo(() => {
    const labels = (showLabels || showFlags)
      ? pointsData.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, alt: p.alt + 0.015, name: p.name, color: p.color, group: p.group, selected: selectedSatIds.includes(p.id), _flags: showFlags, _labels: showLabels }))
      : [];

    if (cpaInfo) {
      labels.push({ id: -1, lat: cpaInfo.midLat, lng: cpaInfo.midLng, alt: cpaInfo.midAlt + 0.01, name: `${cpaInfo.distKm} km`, color: '#ff9800', group: '', selected: false, _flags: showFlags, _labels: showLabels });
    }
    if (groundLineInfo) {
      labels.push({ id: -2, lat: groundLineInfo.midLat, lng: groundLineInfo.midLng, alt: groundLineInfo.midAlt + 0.01, name: `${groundLineInfo.slantKm} km`, color: '#4fc3f7', group: '', selected: false, _flags: showFlags, _labels: showLabels });
    }
    return labels;
  }, [showLabels, showFlags, selectedSatIds, pointsData, cpaInfo, groundLineInfo]);

  // Sync label positions ref
  useEffect(() => {
    const m = new Map<number, { lat: number; lng: number; alt: number }>();
    const activeIds = new Set<number>();
    for (const l of htmlLabelsData) {
      m.set(l.id, { lat: l.lat, lng: l.lng, alt: l.alt });
      activeIds.add(l.id);
    }
    labelPosRef.current = m;
    for (const id of labelElsRef.current.keys()) {
      if (!activeIds.has(id)) labelElsRef.current.delete(id);
    }
  }, [htmlLabelsData]);

  // Footprint polygons
  const footprintData: FootprintDatum[] = useMemo(() => {
    if (!showFootprint || selectedSatIds.length === 0) return [];
    const result: FootprintDatum[] = [];
    for (const id of selectedSatIds) {
      const pos = positions.get(id) ?? massPositions.get(id);
      if (!pos) continue;
      const sat = satellites.find((s) => s.id === id) ?? useSatelliteStore.getState().massSatellites.find((s) => s.id === id);
      const color = sat ? (GROUP_COLORS[sat.group as SatelliteGroup] || '#00d4ff') : '#00d4ff';
      const minElev = sat ? (GROUP_INFO[sat.group as SatelliteGroup]?.minElevationDeg ?? 0) : 0;
      const ring = computeFootprintCircle(pos.lat, pos.lng, pos.alt, 72, minElev);
      if (ring.length === 0) continue;
      result.push({ coords: ring, color });
    }
    return result;
  }, [showFootprint, selectedSatIds, positions, massPositions, satellites]);

  const ringsData = useMemo(() => {
    if (!observer) return [];
    return [{ lat: observer.lat, lng: observer.lng }];
  }, [observer]);

  // Mass group InstancedMesh
  const customLayerData: MassLayerDatum[] = useMemo(() => {
    if (massPositions.size === 0) return [];
    return [{ id: 'mass-constellation', positions: massPositions }];
  }, [massPositions]);

  const starlinkMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const dummyObj = useRef(new THREE.Object3D());
  const massUpRef = useRef(new THREE.Vector3(0, 1, 0));
  const massDirRef = useRef(new THREE.Vector3());

  // Dispose starlink mesh on unmount
  useEffect(() => {
    return () => {
      if (starlinkMeshRef.current) {
        starlinkMeshRef.current.geometry.dispose();
        (starlinkMeshRef.current.material as THREE.Material).dispose();
      }
    };
  }, []);

  const createMassMesh = useCallback(() => {
    const geo = new THREE.BoxGeometry(1.0, 0.2, 0.5);
    const mat = new THREE.MeshBasicMaterial({ color: GROUP_COLORS.starlink, transparent: true, opacity: 0.9 });
    const mesh = new THREE.InstancedMesh(geo, mat, 11000);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.count = 0;
    starlinkMeshRef.current = mesh;
    return mesh;
  }, []);

  const updateMassMesh = useCallback((obj: object) => {
    const mesh = obj as THREE.InstancedMesh;
    if (massPositions.size === 0) { mesh.count = 0; return; }
    let idx = 0;
    const dummy = dummyObj.current;
    const up = massUpRef.current;
    const dir = massDirRef.current;
    massPositions.forEach((pos) => {
      const relAlt = pos.alt / EARTH_RADIUS_KM;
      const vec = polar2Cartesian(pos.lat, pos.lng, relAlt);
      dummy.position.copy(vec);
      dir.copy(vec).negate().normalize();
      dummy.quaternion.setFromUnitVectors(up, dir);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
      idx++;
    });
    mesh.count = idx;
    mesh.instanceMatrix.needsUpdate = true;
  }, [massPositions]);

  const handlePointClick = useCallback((point: object) => {
    selectSatellite((point as PointData).id);
  }, [selectSatellite]);

  const handleGlobeClick = useCallback(({ lat, lng }: { lat: number; lng: number }) => {
    let bestId: number | null = null;
    let bestDist = 3;
    massPositions.forEach((pos, id) => {
      const dLat = pos.lat - lat;
      const dLng = pos.lng - lng;
      const d = Math.sqrt(dLat * dLat + dLng * dLng);
      if (d < bestDist) { bestDist = d; bestId = id; }
    });
    if (bestId !== null) selectSatellite(bestId);
    else setObserver({ lat, lng, alt: 0 });
  }, [setObserver, selectSatellite, massPositions]);

  return (
    <div ref={containerRef} className="w-full h-full relative z-0">
      <CameraControls globeRef={globeRef} />
      {dimensions.width > 0 && (
        <Globe
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          globeImageUrl={nightMode ? '/earth-night-4k.jpg' : '/earth-day-4k.jpg'}
          backgroundImageUrl={nightMode ? '/night-sky.png' : undefined}
          objectsData={pointsData}
          objectLat="lat"
          objectLng="lng"
          objectAltitude="alt"
          objectLabel="name"
          objectThreeObject={(d: object) => {
            const point = d as PointData;
            const c = point.selected ? 0xffffff : point.color;
            const model = point.group === 'stations'
              ? createStationModel(c, point.selected)
              : createSatelliteModel(c, point.selected);
            satModelMapRef.current.set(point.id, model);
            return model;
          }}
          onObjectClick={handlePointClick}
          htmlElementsData={htmlLabelsData}
          htmlLat="lat"
          htmlLng="lng"
          htmlAltitude="alt"
          htmlElement={(d: object) => {
            const data = d as { id: number; name: string; color: string; group: string; selected: boolean };
            const el = document.createElement('div');
            el.setAttribute('data-sat-id', String(data.id));
            if (data.id < 0) {
              el.textContent = data.name;
              el.style.cssText = `color:#fff;font-size:12px;font-weight:700;font-family:system-ui,sans-serif;background:rgba(0,0,0,0.85);padding:3px 8px;border-radius:4px;white-space:nowrap;pointer-events:none;border:1px solid ${data.color};transition:opacity 0.15s;`;
            } else {
              el.style.cssText = `display:flex;align-items:center;gap:3px;white-space:nowrap;pointer-events:none;transition:opacity 0.15s;` + (data.selected
                ? `color:#fff;font-size:11px;font-family:system-ui,sans-serif;background:rgba(0,0,0,0.85);padding:2px 8px;border-radius:4px;transform:translateY(-18px);border:1px solid ${data.color};font-weight:600;`
                : `color:#ccc;font-size:9px;font-family:system-ui,sans-serif;background:rgba(0,0,0,0.5);padding:1px 5px;border-radius:3px;transform:translateY(-14px);`);
              const { showFlags: sf, showLabels: sl } = useSatelliteStore.getState();
              if (sf && data.group) {
                const info = GROUP_INFO[data.group as SatelliteGroup];
                if (info) {
                  const codes = getCountryIsoCodes(info.country);
                  const primaryCode = codes.find((c) => c !== null);
                  if (primaryCode) {
                    const flagEl = document.createElement('span');
                    flagEl.className = `fi fi-${primaryCode}`;
                    flagEl.style.cssText = 'width:14px;height:10px;display:inline-block;background-size:cover;flex-shrink:0;';
                    el.appendChild(flagEl);
                  }
                }
              }
              if (sl) el.appendChild(document.createTextNode(data.name));
            }
            labelElsRef.current.set(data.id, el);
            return el;
          }}
          htmlTransitionDuration={0}
          pathsData={allPaths}
          pathId="pathId"
          pathPoints="points"
          pathPointLat={(p: object) => (p as { lat: number }).lat}
          pathPointLng={(p: object) => (p as { lng: number }).lng}
          pathPointAlt={(p: object) => (p as { alt: number }).alt}
          pathColor={(d: object) => {
            const path = d as CombinedPath;
            const hex = path.color;
            if (path.type === 'look-line' || path.type === 'ground-line') return `${hex}FF`;
            if (path.type === 'beam') {
              const selectedAlpha = Math.round((beamOpacity / 100) * 255).toString(16).padStart(2, '0');
              const normalAlpha = Math.round((beamOpacity / 100) * 180).toString(16).padStart(2, '0');
              return path.selected ? `${hex}${selectedAlpha}` : `${hex}${normalAlpha}`;
            }
            return path.selected ? `${hex}FF` : `${hex}90`;
          }}
          pathStroke={(d: object) => {
            const path = d as CombinedPath;
            if (path.type === 'look-line' || path.type === 'ground-line') return 1.5;
            if (path.type === 'beam') return path.selected ? beamWidth * 1.5 : beamWidth * 0.5;
            return path.selected ? 2 : 0.8;
          }}
          pathDashLength={(d: object) => {
            const path = d as CombinedPath;
            if (path.type === 'look-line' || path.type === 'ground-line') return 0;
            if (path.type === 'beam') return 0.3;
            return path.selected ? 0 : 1;
          }}
          pathDashGap={(d: object) => {
            const path = d as CombinedPath;
            if (path.type === 'look-line' || path.type === 'ground-line') return 0;
            if (path.type === 'beam') return 0.7;
            return path.selected ? 0 : 0.5;
          }}
          pathDashAnimateTime={(d: object) => {
            const path = d as CombinedPath;
            if (path.type === 'look-line' || path.type === 'ground-line') return 0;
            if (path.type === 'beam') {
              const speedMap = [0, 4000, 2000, 800];
              return speedMap[beamSpeed] ?? 2000;
            }
            return 0;
          }}
          pathTransitionDuration={0}
          polygonsData={footprintData}
          polygonCapColor={(d: object) => (d as FootprintDatum).color + '25'}
          polygonSideColor={() => 'rgba(0,0,0,0)'}
          polygonStrokeColor={(d: object) => (d as FootprintDatum).color + '90'}
          polygonAltitude={0.005}
          polygonGeoJsonGeometry={(d: object) => {
            const fp = d as FootprintDatum;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return { type: 'Polygon', coordinates: [fp.coords] } as any;
          }}
          polygonsTransitionDuration={0}
          customLayerData={customLayerData}
          customThreeObject={createMassMesh}
          customThreeObjectUpdate={updateMassMesh}
          ringsData={ringsData}
          ringLat="lat"
          ringLng="lng"
          ringColor={() => '#ff9800'}
          ringMaxRadius={3}
          ringPropagationSpeed={2}
          ringRepeatPeriod={1000}
          onGlobeClick={handleGlobeClick}
          animateIn={false}
        />
      )}
    </div>
  );
}
