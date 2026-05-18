'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { propagateAll } from '@/lib/sgp4';
import { propagateChunked } from '@/lib/propagateChunked';
import { computeOrbitPath } from '@/lib/orbit';
import { EARTH_RADIUS_KM, GROUP_COLORS } from '@/lib/constants';
import type { SatelliteGroup } from '@/lib/constants';
import type { TLEData } from '@/types/satellite';
import { CameraControls } from './CameraControls';

const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

const GLOBE_RADIUS = 100; // three-globe default internal radius

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
  type: 'orbit' | 'beam' | 'footprint';
  points: { lat: number; lng: number; alt: number }[];
  selected: boolean;
  color: string;
}

interface MassLayerDatum {
  id: string;
  positions: Map<number, { lat: number; lng: number; alt: number; velocity: number }>;
}

/** Convert lat/lng/relativeAlt to 3D cartesian (matches three-globe's internal coordinate system) */
function polar2Cartesian(lat: number, lng: number, relAlt: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (90 - lng) * (Math.PI / 180);
  const r = GLOBE_RADIUS * (1 + relAlt);
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

export default function GlobeView() {
  const satellites = useSatelliteStore((s) => s.satellites);
  const positions = useSatelliteStore((s) => s.positions);
  const updatePositions = useSatelliteStore((s) => s.updatePositions);
  const selectSatellite = useSatelliteStore((s) => s.selectSatellite);
  const selectedSatId = useSatelliteStore((s) => s.selectedSatId);
  const observer = useSatelliteStore((s) => s.observer);
  const setObserver = useSatelliteStore((s) => s.setObserver);
  const showTrajectories = useSatelliteStore((s) => s.showTrajectories);
  const showLabels = useSatelliteStore((s) => s.showLabels);
  const showBeams = useSatelliteStore((s) => s.showBeams);
  const nightMode = useSatelliteStore((s) => s.nightMode);
  const beamOpacity = useSatelliteStore((s) => s.beamOpacity);
  const beamMode = useSatelliteStore((s) => s.beamMode);
  const beamWidth = useSatelliteStore((s) => s.beamWidth);
  const beamSpeed = useSatelliteStore((s) => s.beamSpeed);

  // Mass group (Starlink) state
  const massSatellites = useSatelliteStore((s) => s.massSatellites);
  const massPositions = useSatelliteStore((s) => s.massPositions);
  const updateMassPositions = useSatelliteStore((s) => s.updateMassPositions);

  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  // Counter that increments every 30s to force orbit path refresh
  const [orbitEpoch, setOrbitEpoch] = useState(0);

  // Cache satellite TLE references for propagation (avoid re-creating array every tick)
  const satTleRef = useRef<{ tle: TLEData; id: number }[]>([]);
  useEffect(() => {
    satTleRef.current = satellites.map((s) => ({ tle: s.tle, id: s.id }));
  }, [satellites]);

  // Cache mass satellite TLE references
  const massTleRef = useRef<{ tle: TLEData; id: number }[]>([]);
  useEffect(() => {
    massTleRef.current = massSatellites.map((s) => ({ tle: s.tle, id: s.id }));
  }, [massSatellites]);

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

  // Set zoom constraints and damping on OrbitControls
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    const timer = setInterval(() => {
      try {
        const controls = globe.controls();
        if (controls) {
          controls.minDistance = GLOBE_RADIUS * 1.2;
          controls.maxDistance = GLOBE_RADIUS * 8;
          controls.enableDamping = true;
          controls.dampingFactor = 0.1;
          controls.rotateSpeed = 0.5;
          clearInterval(timer);
        }
      } catch {
        // Globe not ready yet
      }
    }, 500);

    return () => clearInterval(timer);
  }, []);

  // Auto-fly camera to selected satellite
  // Fly to satellite when selected from the sidebar
  const prevSelectedRef = useRef<number | null>(null);
  const hasFlewRef = useRef(false);
  useEffect(() => {
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
    const current = globeRef.current.pointOfView();
    globeRef.current.pointOfView(
      {
        lat: pos.lat,
        lng: pos.lng,
        altitude: Math.min(current?.altitude ?? 1.5, 1.5),
      },
      800,
    );
  }, [selectedSatId, positions, massPositions]);

  // Refresh orbit paths every 30 seconds so they stay aligned with satellite positions
  useEffect(() => {
    const interval = setInterval(() => setOrbitEpoch((n) => n + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Position propagation loop — every 2 seconds for normal satellites
  useEffect(() => {
    if (satellites.length === 0) return;

    const tick = () => {
      const now = new Date();
      const newPositions = propagateAll(satTleRef.current, now);
      updatePositions(newPositions);
    };

    tick();
    const interval = setInterval(tick, 2000);
    return () => clearInterval(interval);
  }, [satellites, updatePositions]);

  // Chunked propagation loop — every 5 seconds for mass satellites (Starlink)
  useEffect(() => {
    if (massSatellites.length === 0) return;

    let cancelChunk: (() => void) | null = null;

    const tick = () => {
      const now = new Date();
      cancelChunk = propagateChunked(massTleRef.current, now, (newPositions) => {
        updateMassPositions(newPositions);
      });
    };

    tick();
    const interval = setInterval(tick, 5000);
    return () => {
      clearInterval(interval);
      cancelChunk?.();
    };
  }, [massSatellites, updateMassPositions]);

  // Orbit paths — recompute when satellites change or every 30s (normal satellites only)
  const orbitPathsRaw = useMemo(() => {
    return satellites.map((sat) => ({
      id: sat.id,
      group: sat.group,
      color: GROUP_COLORS[sat.group as SatelliteGroup] || '#00d4ff',
      points: computeOrbitPath(sat.tle, new Date(), 90),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satellites, orbitEpoch]);

  // Points data (normal satellites only)
  const pointsData: PointData[] = useMemo(() => {
    return satellites
      .filter((s) => positions.has(s.id))
      .map((s) => {
        const pos = positions.get(s.id)!;
        const color = GROUP_COLORS[s.group as SatelliteGroup] || '#00d4ff';
        return {
          id: s.id,
          name: s.name,
          lat: pos.lat,
          lng: pos.lng,
          alt: pos.alt / EARTH_RADIUS_KM,
          velocity: pos.velocity,
          selected: s.id === selectedSatId,
          group: s.group,
          color,
        };
      });
  }, [satellites, positions, selectedSatId]);

  // Combined paths: orbit trajectories + scan beams (normal satellites only, not mass)
  const allPaths: CombinedPath[] = useMemo(() => {
    const paths: CombinedPath[] = [];

    // Orbit trajectories (only when toggle is on)
    if (showTrajectories) {
      for (const raw of orbitPathsRaw) {
        paths.push({
          pathId: `orbit-${raw.id}`,
          type: 'orbit',
          points: raw.points,
          selected: raw.id === selectedSatId,
          color: raw.color,
        });
      }
    }

    // Beams — line / cone / footprint modes
    if (showBeams) {
      for (const p of pointsData) {
        const altKm = p.alt * EARTH_RADIUS_KM;
        const radiusKm = altKm * Math.tan((beamWidth * Math.PI) / 180);
        const radiusDeg = radiusKm / 111;
        const cosLat = Math.cos((p.lat * Math.PI) / 180) || 0.01;

        if (beamMode === 'line') {
          // Simple line straight down
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
        } else if (beamMode === 'cone') {
          // Cone edges — 6 lines from satellite to footprint circle
          const CONE_EDGES = 6;
          for (let i = 0; i < CONE_EDGES; i++) {
            const angle = (i / CONE_EDGES) * Math.PI * 2;
            const eLat = p.lat + radiusDeg * Math.cos(angle);
            const eLng = p.lng + (radiusDeg * Math.sin(angle)) / cosLat;
            paths.push({
              pathId: `beam-${p.id}-${i}`,
              type: 'beam',
              points: [
                { lat: p.lat, lng: p.lng, alt: p.alt },
                { lat: eLat, lng: eLng, alt: 0 },
              ],
              selected: p.selected,
              color: p.color,
            });
          }
        }

        // Footprint circle on ground (cone + footprint modes)
        if (beamMode === 'cone' || beamMode === 'footprint') {
          const SEGMENTS = 24;
          const circlePoints: { lat: number; lng: number; alt: number }[] = [];
          for (let i = 0; i <= SEGMENTS; i++) {
            const angle = (i / SEGMENTS) * Math.PI * 2;
            circlePoints.push({
              lat: p.lat + radiusDeg * Math.cos(angle),
              lng: p.lng + (radiusDeg * Math.sin(angle)) / cosLat,
              alt: 0.001,
            });
          }
          paths.push({
            pathId: `footprint-${p.id}`,
            type: 'footprint',
            points: circlePoints,
            selected: p.selected,
            color: p.color,
          });
        }
      }
    }

    return paths;
  }, [showTrajectories, showBeams, beamMode, beamWidth, orbitPathsRaw, selectedSatId, pointsData]);

  // Label for selected satellite only
  const labelsData = useMemo(() => {
    if (!showLabels || selectedSatId === null) return [];
    const sat = pointsData.find((p) => p.id === selectedSatId);
    if (!sat) return [];
    return [{ id: sat.id, lat: sat.lat, lng: sat.lng, alt: sat.alt + 0.02, text: sat.name }];
  }, [showLabels, selectedSatId, pointsData]);

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

  const starlinkMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const dummyObj = useRef(new THREE.Object3D());

  const createMassMesh = useCallback(() => {
    const geo = new THREE.SphereGeometry(0.6, 6, 4); // low-poly for performance
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
    <div ref={containerRef} className="w-full h-full relative">
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
            const radius = point.selected ? 1.8 : 1;
            const geo = new THREE.SphereGeometry(radius, 12, 10);
            const mat = new THREE.MeshBasicMaterial({
              color: point.selected ? 0xffffff : point.color,
            });
            return new THREE.Mesh(geo, mat);
          }}
          onObjectClick={handlePointClick}
          // Label for selected satellite
          labelsData={labelsData}
          labelLat="lat"
          labelLng="lng"
          labelAltitude="alt"
          labelText="text"
          labelSize={1}
          labelColor={() => 'rgba(255, 107, 107, 1)'}
          labelDotRadius={0}
          labelResolution={2}
          labelsTransitionDuration={0}
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
            if (path.type === 'beam' || path.type === 'footprint') {
              const selectedAlpha = Math.round((beamOpacity / 100) * 255).toString(16).padStart(2, '0');
              const normalAlpha = Math.round((beamOpacity / 100) * 180).toString(16).padStart(2, '0');
              // Footprint is dimmer than beam lines
              const fpAlpha = Math.round((beamOpacity / 100) * 120).toString(16).padStart(2, '0');
              if (path.type === 'footprint') {
                return path.selected ? `${hex}${normalAlpha}` : `${hex}${fpAlpha}`;
              }
              return path.selected ? `${hex}${selectedAlpha}` : `${hex}${normalAlpha}`;
            }
            return path.selected ? `${hex}FF` : `${hex}90`;
          }}
          pathStroke={(d: object) => {
            const path = d as CombinedPath;
            if (path.type === 'footprint') return path.selected ? 1.2 : 0.6;
            if (path.type === 'beam') return path.selected ? 0.8 : 0.3;
            return path.selected ? 2 : 0.8;
          }}
          pathDashLength={(d: object) => {
            const path = d as CombinedPath;
            if (path.type === 'footprint') return 0; // solid
            if (path.type === 'beam') return 0.3;
            return path.selected ? 0 : 1;
          }}
          pathDashGap={(d: object) => {
            const path = d as CombinedPath;
            if (path.type === 'footprint') return 0; // solid
            if (path.type === 'beam') return 0.7;
            return path.selected ? 0 : 0.5;
          }}
          pathDashAnimateTime={(d: object) => {
            const path = d as CombinedPath;
            if (path.type === 'footprint') return 0;
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
