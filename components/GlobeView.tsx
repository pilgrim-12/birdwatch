'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { propagateAll } from '@/lib/sgp4';
import { computeOrbitPath } from '@/lib/orbit';
import { EARTH_RADIUS_KM } from '@/lib/constants';
import type { TLEData } from '@/types/satellite';

const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

interface PointData {
  id: number;
  name: string;
  lat: number;
  lng: number;
  alt: number;
  velocity: number;
  selected: boolean;
}

interface CombinedPath {
  pathId: string;
  type: 'orbit' | 'beam';
  points: { lat: number; lng: number; alt: number }[];
  selected: boolean;
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
  const nightMode = useSatelliteStore((s) => s.nightMode);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  // Counter that increments every 30s to force orbit path refresh
  const [orbitEpoch, setOrbitEpoch] = useState(0);

  // Cache satellite TLE references for propagation (avoid re-creating array every tick)
  const satTleRef = useRef<{ tle: TLEData; id: number }[]>([]);
  useEffect(() => {
    satTleRef.current = satellites.map((s) => ({ tle: s.tle, id: s.id }));
  }, [satellites]);

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

  // Refresh orbit paths every 30 seconds so they stay aligned with satellite positions
  useEffect(() => {
    const interval = setInterval(() => setOrbitEpoch((n) => n + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Position propagation loop — every 2 seconds (was 1s, reduced for performance)
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

  // Orbit paths — recompute when satellites change or every 30s
  const orbitPathsRaw = useMemo(() => {
    return satellites.map((sat) => ({
      id: sat.id,
      points: computeOrbitPath(sat.tle, new Date(), 90), // reduced from 180 to 90 steps
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satellites, orbitEpoch]);

  // Points data
  const pointsData: PointData[] = useMemo(() => {
    return satellites
      .filter((s) => positions.has(s.id))
      .map((s) => {
        const pos = positions.get(s.id)!;
        return {
          id: s.id,
          name: s.name,
          lat: pos.lat,
          lng: pos.lng,
          alt: pos.alt / EARTH_RADIUS_KM,
          velocity: pos.velocity,
          selected: s.id === selectedSatId,
        };
      });
  }, [satellites, positions, selectedSatId]);

  // Combined paths: orbit trajectories + scan beams from satellite to ground
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
        });
      }
    }

    // Scan beams — from each satellite to ground
    for (const p of pointsData) {
      paths.push({
        pathId: `beam-${p.id}`,
        type: 'beam',
        points: [
          { lat: p.lat, lng: p.lng, alt: p.alt },
          { lat: p.lat, lng: p.lng, alt: 0 },
        ],
        selected: p.selected,
      });
    }

    return paths;
  }, [showTrajectories, orbitPathsRaw, selectedSatId, pointsData]);

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
    <div ref={containerRef} className="w-full h-full">
      {dimensions.width > 0 && (
        <Globe
          width={dimensions.width}
          height={dimensions.height}
          globeImageUrl={
            nightMode
              ? '//unpkg.com/three-globe/example/img/earth-night.jpg'
              : '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
          }
          backgroundImageUrl={
            nightMode
              ? '//unpkg.com/three-globe/example/img/night-sky.png'
              : undefined
          }
          // Satellite 3D spheres
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
              color: point.selected ? 0xff6b6b : 0x00d4ff,
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
            if (path.type === 'beam') {
              return path.selected
                ? 'rgba(0, 212, 255, 0.7)'
                : 'rgba(0, 212, 255, 0.2)';
            }
            return path.selected
              ? 'rgba(255, 107, 107, 0.8)'
              : 'rgba(0, 212, 255, 0.15)';
          }}
          pathStroke={(d: object) => {
            const path = d as CombinedPath;
            if (path.type === 'beam') return path.selected ? 0.8 : 0.3;
            return path.selected ? 1.5 : 0.4;
          }}
          pathDashLength={(d: object) => {
            const path = d as CombinedPath;
            if (path.type === 'beam') return 0.3;
            // selected orbit: solid line (no dash)
            return path.selected ? 0 : 1;
          }}
          pathDashGap={(d: object) => {
            const path = d as CombinedPath;
            if (path.type === 'beam') return 0.7;
            return path.selected ? 0 : 0.5;
          }}
          pathDashAnimateTime={(d: object) => {
            const path = d as CombinedPath;
            if (path.type === 'beam') return 2000;
            // selected orbit: no animation (solid stable line)
            return 0;
          }}
          pathTransitionDuration={0}
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
