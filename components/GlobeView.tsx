'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { propagateAll } from '@/lib/sgp4';
import { EARTH_RADIUS_KM } from '@/lib/constants';

const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

interface PointData {
  id: number;
  name: string;
  lat: number;
  lng: number;
  alt: number;
  velocity: number;
}

export default function GlobeView() {
  const satellites = useSatelliteStore((s) => s.satellites);
  const positions = useSatelliteStore((s) => s.positions);
  const updatePositions = useSatelliteStore((s) => s.updatePositions);
  const selectSatellite = useSatelliteStore((s) => s.selectSatellite);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

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

  const pointsData: PointData[] = satellites
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
      };
    });

  const handlePointClick = useCallback(
    (point: object) => {
      const p = point as PointData;
      selectSatellite(p.id);
    },
    [selectSatellite],
  );

  return (
    <div ref={containerRef} className="w-full h-full">
      {dimensions.width > 0 && (
        <Globe
          width={dimensions.width}
          height={dimensions.height}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          pointsData={pointsData}
          pointLat="lat"
          pointLng="lng"
          pointAltitude="alt"
          pointColor={() => '#00d4ff'}
          pointRadius={0.5}
          pointLabel="name"
          onPointClick={handlePointClick}
          animateIn={false}
        />
      )}
    </div>
  );
}
