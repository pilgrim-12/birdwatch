'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { computeOrbitPath } from '@/lib/orbit';
import { GROUP_COLORS } from '@/lib/constants';
import type { SatelliteGroup } from '@/lib/constants';

/** Clamp view so map edges don't go past viewport edges */
function clampView(v: { zoom: number; ox: number; oy: number }, w: number, h: number) {
  const mapW = w * v.zoom;
  const mapH = h * v.zoom;
  v.ox = Math.min(0, Math.max(w - mapW, v.ox));
  v.oy = Math.min(0, Math.max(h - mapH, v.oy));
}

/** Convert lat/lng to canvas pixel coordinates with zoom/pan */
function latLngToXY(
  lat: number,
  lng: number,
  w: number,
  h: number,
  zoom: number,
  ox: number,
  oy: number,
): { x: number; y: number } {
  return {
    x: ((lng + 180) / 360) * w * zoom + ox,
    y: ((90 - lat) / 180) * h * zoom + oy,
  };
}

/** Convert screen pixel coordinates back to lat/lng */
function screenToLatLng(
  sx: number,
  sy: number,
  w: number,
  h: number,
  zoom: number,
  ox: number,
  oy: number,
): { lat: number; lng: number } {
  const baseX = (sx - ox) / zoom;
  const baseY = (sy - oy) / zoom;
  return {
    lng: (baseX / w) * 360 - 180,
    lat: 90 - (baseY / h) * 180,
  };
}

export default function FlatMapView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // View state (zoom + pan) — refs to avoid re-renders in RAF loop
  const viewRef = useRef({ zoom: 1, ox: 0, oy: 0 });
  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    startOx: 0,
    startOy: 0,
    moved: false,
  });

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

  // Reset view when dimensions change (avoid stale offsets)
  useEffect(() => {
    viewRef.current = { zoom: 1, ox: 0, oy: 0 };
  }, [dimensions]);

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

  // Satellite click (called from mouseUp when not dragging)
  const selectSatelliteRef = useRef(selectSatellite);
  selectSatelliteRef.current = selectSatellite;

  const handleSatelliteClick = useCallback(
    (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const mx = (e.clientX - rect.left) * dpr;
      const my = (e.clientY - rect.top) * dpr;
      const w = canvas.width;
      const h = canvas.height;
      const v = viewRef.current;

      let bestId: number | null = null;
      let bestDist = 15 * dpr;

      const state = useSatelliteStore.getState();
      state.positions.forEach((pos, id) => {
        const { x, y } = latLngToXY(pos.lat, pos.lng, w, h, v.zoom, v.ox, v.oy);
        const d = Math.hypot(x - mx, y - my);
        if (d < bestDist) {
          bestDist = d;
          bestId = id;
        }
      });

      if (bestId === null) {
        state.massPositions.forEach((pos, id) => {
          const { x, y } = latLngToXY(pos.lat, pos.lng, w, h, v.zoom, v.ox, v.oy);
          const d = Math.hypot(x - mx, y - my);
          if (d < bestDist) {
            bestDist = d;
            bestId = id;
          }
        });
      }

      selectSatelliteRef.current(bestId);
    },
    [],
  );

  // Right-click — set observer (accounting for zoom/pan)
  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const sx = (e.clientX - rect.left) * dpr;
      const sy = (e.clientY - rect.top) * dpr;
      const { lat, lng } = screenToLatLng(
        sx, sy,
        canvas.width, canvas.height,
        viewRef.current.zoom, viewRef.current.ox, viewRef.current.oy,
      );
      setObserver({ lat, lng, alt: 0 });
    },
    [setObserver],
  );

  // Mouse wheel zoom (native event for passive:false)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const mx = (e.clientX - rect.left) * dpr;
      const my = (e.clientY - rect.top) * dpr;

      const v = viewRef.current;
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const newZoom = Math.max(1, Math.min(30, v.zoom * factor));

      // Keep point under mouse fixed
      v.ox = mx - (mx - v.ox) * (newZoom / v.zoom);
      v.oy = my - (my - v.oy) * (newZoom / v.zoom);
      v.zoom = newZoom;

      clampView(v, canvas.width, canvas.height);
    };

    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, [dimensions]);

  // Mouse drag for panning + click detection
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const d = dragRef.current;
      d.dragging = true;
      d.startX = e.clientX;
      d.startY = e.clientY;
      d.startOx = viewRef.current.ox;
      d.startOy = viewRef.current.oy;
      d.moved = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d.dragging) return;
      const dpr = window.devicePixelRatio || 1;
      const dx = (e.clientX - d.startX) * dpr;
      const dy = (e.clientY - d.startY) * dpr;
      if (Math.abs(dx) > 3 * dpr || Math.abs(dy) > 3 * dpr) d.moved = true;

      if (d.moved) {
        const v = viewRef.current;
        v.ox = d.startOx + dx;
        v.oy = d.startOy + dy;
        clampView(v, canvas.width, canvas.height);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d.dragging) return;
      d.dragging = false;
      if (!d.moved && e.button === 0) {
        handleSatelliteClick(e);
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dimensions, handleSatelliteClick]);

  // Double-click to reset zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = () => {
      viewRef.current = { zoom: 1, ox: 0, oy: 0 };
    };
    canvas.addEventListener('dblclick', handler);
    return () => canvas.removeEventListener('dblclick', handler);
  }, [dimensions]);

  // Touch support: pinch-zoom and drag
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let lastTouchDist = 0;
    let lastTouchCenter = { x: 0, y: 0 };
    let touchStartOx = 0;
    let touchStartOy = 0;
    let singleTouchStart = { x: 0, y: 0 };
    let touchMoved = false;

    const getTouchDist = (t1: Touch, t2: Touch) =>
      Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    const getTouchCenter = (t1: Touch, t2: Touch) => ({
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2,
    });

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        lastTouchDist = getTouchDist(e.touches[0], e.touches[1]);
        lastTouchCenter = getTouchCenter(e.touches[0], e.touches[1]);
        touchStartOx = viewRef.current.ox;
        touchStartOy = viewRef.current.oy;
      } else if (e.touches.length === 1) {
        singleTouchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        touchStartOx = viewRef.current.ox;
        touchStartOy = viewRef.current.oy;
        touchMoved = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const dpr = window.devicePixelRatio || 1;
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getTouchDist(e.touches[0], e.touches[1]);
        const center = getTouchCenter(e.touches[0], e.touches[1]);
        const rect = canvas.getBoundingClientRect();
        const mx = (center.x - rect.left) * dpr;
        const my = (center.y - rect.top) * dpr;

        const v = viewRef.current;
        const scale = dist / lastTouchDist;
        const newZoom = Math.max(1, Math.min(30, v.zoom * scale));

        v.ox = mx - (mx - v.ox) * (newZoom / v.zoom);
        v.oy = my - (my - v.oy) * (newZoom / v.zoom);
        v.zoom = newZoom;

        // Also pan with two-finger drag
        const dcx = (center.x - lastTouchCenter.x) * dpr;
        const dcy = (center.y - lastTouchCenter.y) * dpr;
        v.ox += dcx;
        v.oy += dcy;

        clampView(v, canvas.width, canvas.height);
        lastTouchDist = dist;
        lastTouchCenter = center;
      } else if (e.touches.length === 1 && viewRef.current.zoom > 1) {
        // Single-finger pan only when zoomed in
        e.preventDefault();
        const dx = (e.touches[0].clientX - singleTouchStart.x) * dpr;
        const dy = (e.touches[0].clientY - singleTouchStart.y) * dpr;
        if (Math.abs(dx) > 3 * dpr || Math.abs(dy) > 3 * dpr) touchMoved = true;

        if (touchMoved) {
          const v = viewRef.current;
          v.ox = touchStartOx + dx;
          v.oy = touchStartOy + dy;
          clampView(v, canvas.width, canvas.height);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0 && !touchMoved && e.changedTouches.length === 1) {
        // Tap — select satellite
        const touch = e.changedTouches[0];
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const mx = (touch.clientX - rect.left) * dpr;
        const my = (touch.clientY - rect.top) * dpr;
        const w = canvas.width;
        const h = canvas.height;
        const v = viewRef.current;

        let bestId: number | null = null;
        let bestDist = 20 * dpr;
        const state = useSatelliteStore.getState();

        state.positions.forEach((pos, id) => {
          const { x, y } = latLngToXY(pos.lat, pos.lng, w, h, v.zoom, v.ox, v.oy);
          const d = Math.hypot(x - mx, y - my);
          if (d < bestDist) { bestDist = d; bestId = id; }
        });
        if (bestId === null) {
          state.massPositions.forEach((pos, id) => {
            const { x, y } = latLngToXY(pos.lat, pos.lng, w, h, v.zoom, v.ox, v.oy);
            const d = Math.hypot(x - mx, y - my);
            if (d < bestDist) { bestDist = d; bestId = id; }
          });
        }
        selectSatelliteRef.current(bestId);
      }
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [dimensions]);

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
      const v = viewRef.current;
      const { zoom, ox, oy } = v;

      // --- Clear ---
      ctx.clearRect(0, 0, w, h);

      // --- Background ---
      if (earthImgRef.current) {
        ctx.drawImage(earthImgRef.current, ox, oy, w * zoom, h * zoom);
      } else {
        ctx.fillStyle = '#0a1628';
        ctx.fillRect(0, 0, w, h);
      }

      // --- Grid lines ---
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      for (let gLng = -150; gLng <= 180; gLng += 30) {
        const x = ((gLng + 180) / 360) * w * zoom + ox;
        if (x < 0 || x > w) continue;
        ctx.beginPath();
        ctx.moveTo(x, Math.max(0, oy));
        ctx.lineTo(x, Math.min(h, oy + h * zoom));
        ctx.stroke();
      }
      for (let gLat = -60; gLat <= 90; gLat += 30) {
        const y = ((90 - gLat) / 180) * h * zoom + oy;
        if (y < 0 || y > h) continue;
        ctx.beginPath();
        ctx.moveTo(Math.max(0, ox), y);
        ctx.lineTo(Math.min(w, ox + w * zoom), y);
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
            const { x, y } = latLngToXY(orbit.points[i].lat, orbit.points[i].lng, w, h, zoom, ox, oy);
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

      // --- Beams ---
      if (state.showBeams) {
        const alpha = state.beamOpacity / 100;
        state.positions.forEach((pos, id) => {
          const sat = satellites.find((s) => s.id === id);
          if (!sat) return;
          const color = GROUP_COLORS[sat.group as SatelliteGroup] || '#00d4ff';
          const { x, y } = latLngToXY(pos.lat, pos.lng, w, h, zoom, ox, oy);
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
      const dotSize = zoom > 5 ? 3 : 2;
      state.massPositions.forEach((pos) => {
        const { x, y } = latLngToXY(pos.lat, pos.lng, w, h, zoom, ox, oy);
        // Skip dots outside viewport
        if (x < -2 || x > w + 2 || y < -2 || y > h + 2) return;
        ctx.fillRect(x - dotSize / 2, y - dotSize / 2, dotSize, dotSize);
      });
      ctx.globalAlpha = 1;

      // --- Normal satellite dots ---
      const satGroupMap = new Map(satellites.map((s) => [s.id, s]));
      state.positions.forEach((pos, id) => {
        const sat = satGroupMap.get(id);
        if (!sat) return;
        const color = GROUP_COLORS[sat.group as SatelliteGroup] || '#00d4ff';
        const isSelected = id === state.selectedSatId;
        const { x, y } = latLngToXY(pos.lat, pos.lng, w, h, zoom, ox, oy);

        // Skip dots outside viewport (with margin)
        if (x < -12 || x > w + 12 || y < -12 || y > h + 12) return;

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
          const { x, y } = latLngToXY(pos.lat, pos.lng, w, h, zoom, ox, oy);
          if (x < -50 || x > w + 50 || y < -20 || y > h + 20) return;
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
          const { x, y } = latLngToXY(pos.lat, pos.lng, w, h, zoom, ox, oy);
          ctx.font = 'bold 11px system-ui, sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(sat.name, x + 8, y - 4);
        }
      }

      // --- Observer marker (pulsating rings like 3D globe) ---
      if (state.observer) {
        const { x, y } = latLngToXY(state.observer.lat, state.observer.lng, w, h, zoom, ox, oy);
        const t = performance.now();
        const maxRadius = 25;
        const period = 1000; // ms per ring cycle

        // Draw 3 expanding rings at different phases
        for (let i = 0; i < 3; i++) {
          const phase = ((t + i * (period / 3)) % period) / period; // 0→1
          const radius = phase * maxRadius;
          const alpha = 1 - phase;
          ctx.strokeStyle = '#ff9800';
          ctx.globalAlpha = alpha * 0.7;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Center dot
        ctx.fillStyle = '#ff9800';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- Zoom indicator (show when zoomed in) ---
      if (zoom > 1.05) {
        const label = `${zoom.toFixed(1)}x`;
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        const tw = ctx.measureText(label).width;
        ctx.fillRect(w - tw - 16, 8, tw + 12, 20);
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, w - tw - 10, 18);
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
        onContextMenu={handleContextMenu}
      />
    </div>
  );
}
