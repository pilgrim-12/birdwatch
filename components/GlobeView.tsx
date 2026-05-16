'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { propagateAll } from '@/lib/sgp4';
import { computeOrbitPath } from '@/lib/orbit';
import { EARTH_RADIUS_KM } from '@/lib/constants';

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

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
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

  // Refresh orbit paths every 30 seconds so they stay aligned with satellite positions
  useEffect(() => {
    const interval = setInterval(() => setOrbitEpoch((n) => n + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Position propagation loop — every 1 second
  useEffect(() => {
    if (satellites.length === 0) return;

    const tick = () => {
      const now = new Date();
      const newPositions = propagateAll(
        satellites.map((s) => ({ tle: s.tle, id: s.id })),
        now,
      );
      updatePositions(newPositions);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [satellites, updatePositions]);

  // Orbit paths — recompute when satellites change or every 30s
  const orbitPathsRaw = useMemo(() => {
    return satellites.map((sat) => ({
      id: sat.id,
      points: computeOrbitPath(sat.tle, new Date()),
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

    // Scan beams — always visible, from satellite altitude down to Earth surface
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
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          // Satellite dots — small spheres, instant position updates (no flicker)
          pointsData={pointsData}
          pointId="id"
          pointLat="lat"
          pointLng="lng"
          pointAltitude="alt"
          pointColor={(d: object) =>
            (d as PointData).selected ? '#ff6b6b' : '#00d4ff'
          }
          pointRadius={(d: object) => ((d as PointData).selected ? 0.12 : 0.06)}
          pointLabel="name"
          onPointClick={handlePointClick}
          pointsTransitionDuration={0}
          // Label for selected satellite
          labelsData={labelsData}
          labelLat="lat"
          labelLng="lng"
          labelAltitude="alt"
          labelText="text"
          labelSize={1}
          labelColor={() => 'rgba(255, 107, 107, 1)'}
          labelDotRadius={0}
          labelResolution={3}
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
                ? 'rgba(255, 107, 107, 0.25)'
                : 'rgba(0, 212, 255, 0.1)';
            }
            return path.selected
              ? 'rgba(255, 107, 107, 0.7)'
              : 'rgba(0, 212, 255, 0.15)';
          }}
          pathStroke={(d: object) => {
            const path = d as CombinedPath;
            if (path.type === 'beam') return path.selected ? 0.6 : 0.2;
            return path.selected ? 1.5 : 0.4;
          }}
          pathDashLength={(d: object) => {
            const path = d as CombinedPath;
            if (path.type === 'beam') return 0.4;
            return path.selected ? 3 : 1;
          }}
          pathDashGap={(d: object) => {
            const path = d as CombinedPath;
            if (path.type === 'beam') return 0.6;
            return path.selected ? 1.5 : 0.5;
          }}
          pathDashAnimateTime={(d: object) => {
            const path = d as CombinedPath;
            if (path.type === 'beam') return path.selected ? 1500 : 2500;
            return path.selected ? 20000 : 0;
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
