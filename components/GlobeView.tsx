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

interface PathData {
  id: number;
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

  // Position propagation loop
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

  // Compute orbit paths (expensive — only recompute when satellites change)
  const orbitPathsRaw = useMemo(() => {
    return satellites.map((sat) => ({
      id: sat.id,
      points: computeOrbitPath(sat.tle, new Date()),
    }));
  }, [satellites]);

  // Apply visibility toggle and selection state
  const orbitPaths: PathData[] = useMemo(() => {
    if (!showTrajectories) return [];
    return orbitPathsRaw.map((p) => ({
      ...p,
      selected: p.id === selectedSatId,
    }));
  }, [orbitPathsRaw, showTrajectories, selectedSatId]);

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

  // Labels: only show for selected satellite to avoid overlap.
  // When showLabels is on but nothing is selected, show nothing (use hover tooltips instead).
  const labelsData = useMemo(() => {
    if (!showLabels || selectedSatId === null) return [];
    const sat = pointsData.find((p) => p.id === selectedSatId);
    if (!sat) return [];
    return [
      {
        id: sat.id,
        lat: sat.lat,
        lng: sat.lng,
        alt: sat.alt + 0.02,
        text: sat.name,
      },
    ];
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
          // Points (satellites) — merged into a single Points geometry to avoid flicker
          pointsData={pointsData}
          pointId="id"
          pointLat="lat"
          pointLng="lng"
          pointAltitude="alt"
          pointColor={(d: object) =>
            (d as PointData).selected ? '#ff6b6b' : '#00d4ff'
          }
          pointRadius={(d: object) => ((d as PointData).selected ? 0.25 : 0.12)}
          pointLabel="name"
          onPointClick={handlePointClick}
          pointsMerge={false}
          pointsTransitionDuration={800}
          // Label for selected satellite only
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
          // Paths (orbit trajectories)
          pathsData={orbitPaths}
          pathPoints="points"
          pathPointLat={(p: object) => (p as { lat: number }).lat}
          pathPointLng={(p: object) => (p as { lng: number }).lng}
          pathPointAlt={(p: object) => (p as { alt: number }).alt}
          pathColor={(d: object) =>
            (d as PathData).selected
              ? 'rgba(255, 107, 107, 0.7)'
              : 'rgba(0, 212, 255, 0.15)'
          }
          pathStroke={(d: object) => ((d as PathData).selected ? 1.5 : 0.4)}
          pathDashLength={(d: object) => ((d as PathData).selected ? 3 : 1)}
          pathDashGap={(d: object) => ((d as PathData).selected ? 1.5 : 0.5)}
          pathDashAnimateTime={(d: object) =>
            (d as PathData).selected ? 20000 : 0
          }
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
