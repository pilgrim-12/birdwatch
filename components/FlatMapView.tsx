'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { computeOrbitPath } from '@/lib/orbit';
import { GROUP_COLORS } from '@/lib/constants';
import type { SatelliteGroup } from '@/lib/constants';

/** Convert lat/lng to canvas pixel coordinates (equirectangular projection) */
function latLngToXY(
  lat: number,
  lng: number,
  w: number,
  h: number,
): { x: number; y: number } {
  return {
    x: ((lng + 180) / 360) * w,
    y: ((90 - lat) / 180) * h,
  };
}

export default function FlatMapView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Earth texture
  const nightMode = useSatelliteStore((s) => s.nightMode);
  const earthImgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = nightMode ? '/earth-night-4k.jpg' : '/earth-day-4k.jpg';
    img.onload = () => {
      earthImgRef.current = img;
      setImgLoaded(true);
    };
    return () => {
      img.onload = null;
    };
  }, [nightMode]);

  // Store selectors (stable references via Zustand)
  const satellites = useSatelliteStore((s) => s.satellites);
  const positions = useSatelliteStore((s) => s.positions);
  const massPositions = useSatelliteStore((s) => s.massPositions);
  const selectedSatId = useSatelliteStore((s) => s.selectedSatId);
  const selectSatellite = useSatelliteStore((s) => s.selectSatellite);
  const observer = useSatelliteStore((s) => s.observer);
  const setObserver = useSatelliteStore((s) => s.setObserver);
  const showTrajectories = useSatelliteStore((s) => s.showTrajectories);
  const showLabels = useSatelliteStore((s) => s.showLabels);
  const showBeams = useSatelliteStore((s) => s.showBeams);
  const beamOpacity = useSatelliteStore((s) => s.beamOpacity);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Orbit path cache (recompute every 30s)
  const [orbitEpoch, setOrbitEpoch] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setOrbitEpoch((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const orbitPaths = useMemo(() => {
    return satellites.map((sat) => ({
      id: sat.id,
      group: sat.group,
      color: GROUP_COLORS[sat.group as SatelliteGroup] || '#00d4ff',
      points: computeOrbitPath(sat.tle, new Date(), sat.id === selectedSatId ? 90 : 60),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satellites, orbitEpoch, selectedSatId]);

  // Click handler — find nearest satellite
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const mx = (e.clientX - rect.left) * dpr;
      const my = (e.clientY - rect.top) * dpr;
      const w = canvas.width;
      const h = canvas.height;

      let bestId: number | null = null;
      let bestDist = 15 * dpr; // threshold in CSS pixels

      // Check normal satellites first (priority)
      const state = useSatelliteStore.getState();
      state.positions.forEach((pos, id) => {
        const { x, y } = latLngToXY(pos.lat, pos.lng, w, h);
        const d = Math.hypot(x - mx, y - my);
        if (d < bestDist) {
          bestDist = d;
          bestId = id;
        }
      });

      // Fall back to mass satellites if no normal sat found
      if (bestId === null) {
        state.massPositions.forEach((pos, id) => {
          const { x, y } = latLngToXY(pos.lat, pos.lng, w, h);
          const d = Math.hypot(x - mx, y - my);
          if (d < bestDist) {
            bestDist = d;
            bestId = id;
          }
        });
      }

      selectSatellite(bestId);
    },
    [selectSatellite],
  );

  // Right-click — set observer
  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const w = rect.width;
      const h = rect.height;
      const lng = (cx / w) * 360 - 180;
      const lat = 90 - (cy / h) * 180;
      setObserver({ lat, lng, alt: 0 });
    },
    [setObserver],
  );

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;

    function draw() {
      raf = requestAnimationFrame(draw);
      if (!ctx) return;
      const w = canvas!.width;
      const h = canvas!.height;
      const state = useSatelliteStore.getState();

      // --- Background ---
      if (earthImgRef.current) {
        ctx.drawImage(earthImgRef.current, 0, 0, w, h);
      } else {
        ctx.fillStyle = '#0a1628';
        ctx.fillRect(0, 0, w, h);
      }

      // --- Grid lines ---
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      for (let lng = -150; lng <= 180; lng += 30) {
        const x = ((lng + 180) / 360) * w;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let lat = -60; lat <= 90; lat += 30) {
        const y = ((90 - lat) / 180) * h;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // --- Orbit ground tracks ---
      if (state.showTrajectories || state.selectedSatId !== null) {
        for (const orbit of orbitPaths) {
          const isSelected = orbit.id === state.selectedSatId;
          if (!state.showTrajectories && !isSelected) continue;
          ctx.strokeStyle = isSelected ? orbit.color : orbit.color + '70';
          ctx.lineWidth = isSelected ? 2 : 1;
          ctx.beginPath();
          let penDown = false;
          for (let i = 0; i < orbit.points.length; i++) {
            const { x, y } = latLngToXY(orbit.points[i].lat, orbit.points[i].lng, w, h);
            if (i > 0 && Math.abs(orbit.points[i].lng - orbit.points[i - 1].lng) > 180) {
              ctx.stroke();
              ctx.beginPath();
              penDown = false;
            }
            if (!penDown) {
              ctx.moveTo(x, y);
              penDown = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();
        }
      }

      // --- Beams (lines from satellite to ground point) ---
      if (state.showBeams) {
        const alpha = state.beamOpacity / 100;
        state.positions.forEach((pos, id) => {
          const sat = satellites.find((s) => s.id === id);
          if (!sat) return;
          const color = GROUP_COLORS[sat.group as SatelliteGroup] || '#00d4ff';
          const { x, y } = latLngToXY(pos.lat, pos.lng, w, h);
          ctx.fillStyle = color;
          ctx.globalAlpha = alpha * 0.5;
          ctx.beginPath();
          ctx.arc(x, y, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        });
      }

      // --- Mass satellite dots ---
      const massColor = GROUP_COLORS.starlink;
      ctx.fillStyle = massColor;
      ctx.globalAlpha = 0.6;
      state.massPositions.forEach((pos) => {
        const { x, y } = latLngToXY(pos.lat, pos.lng, w, h);
        ctx.fillRect(x - 1, y - 1, 2, 2);
      });
      ctx.globalAlpha = 1;

      // --- Normal satellite dots ---
      const satGroupMap = new Map(satellites.map((s) => [s.id, s]));
      state.positions.forEach((pos, id) => {
        const sat = satGroupMap.get(id);
        if (!sat) return;
        const color = GROUP_COLORS[sat.group as SatelliteGroup] || '#00d4ff';
        const isSelected = id === state.selectedSatId;
        const { x, y } = latLngToXY(pos.lat, pos.lng, w, h);

        ctx.fillStyle = isSelected ? '#ffffff' : color;
        ctx.beginPath();
        ctx.arc(x, y, isSelected ? 6 : 3.5, 0, Math.PI * 2);
        ctx.fill();

        if (isSelected) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, 10, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // --- Labels ---
      if (state.showLabels) {
        ctx.font = '10px system-ui, sans-serif';
        ctx.textBaseline = 'bottom';
        state.positions.forEach((pos, id) => {
          const sat = satGroupMap.get(id);
          if (!sat) return;
          const isSelected = id === state.selectedSatId;
          const { x, y } = latLngToXY(pos.lat, pos.lng, w, h);
          ctx.fillStyle = isSelected ? '#ffffff' : '#cccccc';
          ctx.globalAlpha = isSelected ? 1 : 0.7;
          ctx.fillText(sat.name, x + 6, y - 2);
        });
        ctx.globalAlpha = 1;
      }

      // --- Selected satellite name (always show if selected) ---
      if (state.selectedSatId !== null && !state.showLabels) {
        const pos = state.positions.get(state.selectedSatId) ?? state.massPositions.get(state.selectedSatId);
        const sat = satGroupMap.get(state.selectedSatId) ??
          useSatelliteStore.getState().massSatellites.find((s) => s.id === state.selectedSatId);
        if (pos && sat) {
          const { x, y } = latLngToXY(pos.lat, pos.lng, w, h);
          ctx.font = 'bold 11px system-ui, sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(sat.name, x + 8, y - 4);
        }
      }

      // --- Observer marker ---
      if (state.observer) {
        const { x, y } = latLngToXY(state.observer.lat, state.observer.lng, w, h);
        ctx.strokeStyle = '#ff9800';
        ctx.lineWidth = 2;
        // Crosshair
        ctx.beginPath();
        ctx.moveTo(x - 8, y);
        ctx.lineTo(x + 8, y);
        ctx.moveTo(x, y - 8);
        ctx.lineTo(x, y + 8);
        ctx.stroke();
        // Circle
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    draw();
    return () => cancelAnimationFrame(raf);
  }, [dimensions, imgLoaded, satellites, positions, massPositions, selectedSatId, observer, showTrajectories, showLabels, showBeams, beamOpacity, orbitPaths, nightMode]);

  return (
    <div ref={containerRef} className="w-full h-full relative z-0 bg-[#0a1628]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      />
    </div>
  );
}
