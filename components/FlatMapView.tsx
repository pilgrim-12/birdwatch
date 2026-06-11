'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { computeOrbitPath } from '@/lib/orbit';
import { EARTH_RADIUS_KM, GROUP_COLORS, GROUP_INFO } from '@/lib/constants';
import type { SatelliteGroup } from '@/lib/constants';
import { getGroupPrimaryIsoCode, loadFlagImages } from '@/lib/countryFlags';
import { computeFootprintCircle } from '@/lib/footprint';
import { clampView, latLngToXY, screenToLatLng, haversineDistance } from '@/lib/flatMapMath';

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
  const selectedSatIds = useSatelliteStore((s) => s.selectedSatIds);
  const selectSatellite = useSatelliteStore((s) => s.selectSatellite);
  const observer = useSatelliteStore((s) => s.observer);
  const setObserver = useSatelliteStore((s) => s.setObserver);
  const showTrajectories = useSatelliteStore((s) => s.showTrajectories);
  const showLabels = useSatelliteStore((s) => s.showLabels);
  const showFlags = useSatelliteStore((s) => s.showFlags);
  const showBeams = useSatelliteStore((s) => s.showBeams);

  // Preload flag images for canvas rendering when flags toggle is on
  const flagImagesRef = useRef(new Map<string, HTMLImageElement>());
  useEffect(() => {
    if (showFlags) flagImagesRef.current = loadFlagImages();
  }, [showFlags]);
  const beamOpacity = useSatelliteStore((s) => s.beamOpacity);
  const showLookLine = useSatelliteStore((s) => s.showLookLine);

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
    const results = satellites.map((sat) => ({
      id: sat.id,
      group: sat.group,
      color: GROUP_COLORS[sat.group as SatelliteGroup] || '#00d4ff',
      points: computeOrbitPath(sat.tle, new Date(), selectedSatIds.includes(sat.id) ? 90 : 60),
    }));

    // Include selected mass satellite orbits (Starlink / OneWeb / Active)
    // Read from store snapshot to avoid adding massSatellites to deps
    const resultIds = new Set(results.map((r) => r.id));
    for (const selId of selectedSatIds) {
      if (!resultIds.has(selId)) {
        const massSat = useSatelliteStore.getState().massSatellites.find((s) => s.id === selId);
        if (massSat) {
          results.push({
            id: massSat.id,
            group: massSat.group,
            color: GROUP_COLORS[massSat.group as SatelliteGroup] || '#00d4ff',
            points: computeOrbitPath(massSat.tle, new Date(), 90),
          });
        }
      }
    }

    return results;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satellites, orbitEpoch, selectedSatIds]);

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

      // --- Footprint circles for selected satellites ---
      if (state.showFootprint && state.selectedSatIds.length > 0) {
        const satGroupMap2 = new Map(satellites.map((s) => [s.id, s]));
        for (const selId of state.selectedSatIds) {
          const pos = state.positions.get(selId) ?? state.massPositions.get(selId);
          if (!pos) continue;
          const sat = satGroupMap2.get(selId)
            ?? useSatelliteStore.getState().massSatellites.find((s) => s.id === selId);
          const color = sat
            ? (GROUP_COLORS[sat.group as SatelliteGroup] || '#00d4ff')
            : '#00d4ff';
          const minElev = sat
            ? (GROUP_INFO[sat.group as SatelliteGroup]?.minElevationDeg ?? 0)
            : 0;

          const ring = computeFootprintCircle(pos.lat, pos.lng, pos.alt, 72, minElev);
          if (ring.length === 0) continue;

          // Fill
          ctx.fillStyle = color + '18';
          ctx.beginPath();
          let started = false;
          for (const [pLng, pLat] of ring) {
            const { x: px, y: py } = latLngToXY(pLat, pLng, w, h, zoom, ox, oy);
            if (!started) { ctx.moveTo(px, py); started = true; }
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();

          // Stroke
          ctx.strokeStyle = color + '70';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          started = false;
          for (let i = 0; i < ring.length; i++) {
            const [pLng, pLat] = ring[i];
            const { x: px, y: py } = latLngToXY(pLat, pLng, w, h, zoom, ox, oy);
            // Break line at antimeridian wraps
            if (i > 0 && Math.abs(ring[i][0] - ring[i - 1][0]) > 180) {
              ctx.stroke();
              ctx.beginPath();
              started = false;
            }
            if (!started) { ctx.moveTo(px, py); started = true; }
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // --- Orbit ground tracks ---
      if (state.showTrajectories || state.selectedSatIds.length > 0) {
        for (const orbit of orbitPaths) {
          const isSelected = state.selectedSatIds.includes(orbit.id);
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

      // --- Satellite lookup map (shared by beams, dots, labels) ---
      const satGroupMap = new Map(satellites.map((s) => [s.id, s]));

      // --- Beams ---
      if (state.showBeams) {
        const alpha = state.beamOpacity / 100;
        state.positions.forEach((pos, id) => {
          const sat = satGroupMap.get(id);
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

      // --- Zoom-aware scale factor for dots, labels, markers ---
      const zs = Math.min(Math.max(zoom, 1), 12); // clamp
      const scale = 0.6 + zs * 0.4; // 1.0 at zoom=1, grows smoothly

      // --- Mass satellite dots ---
      const massColor = GROUP_COLORS.starlink;
      ctx.fillStyle = massColor;
      ctx.globalAlpha = 0.85;
      const dotSize = Math.round(2 * scale);
      state.massPositions.forEach((pos) => {
        const { x, y } = latLngToXY(pos.lat, pos.lng, w, h, zoom, ox, oy);
        // Skip dots outside viewport
        if (x < -2 || x > w + 2 || y < -2 || y > h + 2) return;
        ctx.fillRect(x - dotSize / 2, y - dotSize / 2, dotSize, dotSize);
      });
      ctx.globalAlpha = 1;

      // --- Normal satellite dots ---
      state.positions.forEach((pos, id) => {
        const sat = satGroupMap.get(id);
        if (!sat) return;
        const color = GROUP_COLORS[sat.group as SatelliteGroup] || '#00d4ff';
        const isSelected = state.selectedSatIds.includes(id);
        const isStation = sat.group === 'stations';
        const { x, y } = latLngToXY(pos.lat, pos.lng, w, h, zoom, ox, oy);

        // Skip dots outside viewport (with margin)
        const margin = 12 * scale;
        if (x < -margin || x > w + margin || y < -margin || y > h + margin) return;

        ctx.fillStyle = isSelected ? '#ffffff' : color;

        if (isStation) {
          // Station: diamond shape, larger
          const r = (isSelected ? 8 : 5) * scale;
          ctx.beginPath();
          ctx.moveTo(x, y - r);
          ctx.lineTo(x + r, y);
          ctx.lineTo(x, y + r);
          ctx.lineTo(x - r, y);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = isSelected ? color : 'rgba(255,255,255,0.5)';
          ctx.lineWidth = 1.5 * scale;
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(x, y, (isSelected ? 6 : 3.5) * scale, 0, Math.PI * 2);
          ctx.fill();
        }

        if (isSelected) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 2 * scale;
          ctx.beginPath();
          ctx.arc(x, y, (isStation ? 14 : 10) * scale, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // --- Labels & Flags ---
      if (state.showLabels || state.showFlags) {
        const fontSize = Math.round(10 * scale);
        ctx.font = `${fontSize}px system-ui, sans-serif`;
        ctx.textBaseline = 'bottom';
        const flagW = Math.round(14 * scale);
        const flagH = Math.round(10 * scale);
        const flagCache = flagImagesRef.current;
        state.positions.forEach((pos, id) => {
          const sat = satGroupMap.get(id);
          if (!sat) return;
          const isSelected = state.selectedSatIds.includes(id);
          const { x, y } = latLngToXY(pos.lat, pos.lng, w, h, zoom, ox, oy);
          if (x < -50 || x > w + 50 || y < -20 || y > h + 20) return;
          let offsetX = x + 6 * scale;
          // Draw flag
          if (state.showFlags) {
            const isoCode = getGroupPrimaryIsoCode(sat.group);
            if (isoCode) {
              const flagImg = flagCache.get(isoCode);
              if (flagImg && flagImg.complete) {
                ctx.globalAlpha = isSelected ? 1 : 0.7;
                ctx.drawImage(flagImg, offsetX, y - flagH - 1 * scale, flagW, flagH);
                offsetX += flagW + 3 * scale;
              }
            }
          }
          // Draw name
          if (state.showLabels) {
            ctx.fillStyle = isSelected ? '#ffffff' : '#cccccc';
            ctx.globalAlpha = isSelected ? 1 : 0.7;
            ctx.fillText(sat.name, offsetX, y - 2 * scale);
          }
        });
        ctx.globalAlpha = 1;
      }

      // --- Selected satellite names (always show if selected) ---
      if (state.selectedSatIds.length > 0 && !state.showLabels) {
        const massSats = useSatelliteStore.getState().massSatellites;
        for (const selId of state.selectedSatIds) {
          const pos = state.positions.get(selId) ?? state.massPositions.get(selId);
          const sat = satGroupMap.get(selId) ?? massSats.find((s) => s.id === selId);
          if (pos && sat) {
            const { x, y } = latLngToXY(pos.lat, pos.lng, w, h, zoom, ox, oy);
            const fontSize = Math.round(11 * scale);
            ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
            ctx.fillStyle = '#ffffff';
            ctx.fillText(sat.name, x + 8 * scale, y - 4 * scale);
          }
        }
      }

      // --- CPA look-line: observer → closest point on selected orbit ---
      const primarySatId = state.selectedSatIds.length > 0 ? state.selectedSatIds[0] : null;
      if (state.showLookLine && state.observer && primarySatId !== null) {
        // Try normal orbit paths first, then compute on-the-fly for mass satellites
        let cpaPoints = orbitPaths.find((o) => o.id === primarySatId)?.points;
        if (!cpaPoints) {
          const massSat = state.massSatellites.find((s) => s.id === primarySatId);
          if (massSat) {
            cpaPoints = computeOrbitPath(massSat.tle, new Date(), 60);
          }
        }
        if (cpaPoints && cpaPoints.length > 0) {
          let minDist = Infinity;
          let closest = cpaPoints[0];
          for (const pt of cpaPoints) {
            const d = haversineDistance(state.observer.lat, state.observer.lng, pt.lat, pt.lng);
            if (d < minDist) { minDist = d; closest = pt; }
          }

          const obsXY = latLngToXY(state.observer.lat, state.observer.lng, w, h, zoom, ox, oy);
          const cpaXY = latLngToXY(closest.lat, closest.lng, w, h, zoom, ox, oy);

          // Dashed orange line
          ctx.strokeStyle = '#ff9800';
          ctx.lineWidth = 2 * scale;
          ctx.setLineDash([6 * scale, 4 * scale]);
          ctx.beginPath();
          ctx.moveTo(obsXY.x, obsXY.y);
          ctx.lineTo(cpaXY.x, cpaXY.y);
          ctx.stroke();
          ctx.setLineDash([]);

          // CPA point marker
          ctx.fillStyle = '#ff9800';
          ctx.beginPath();
          ctx.arc(cpaXY.x, cpaXY.y, 4 * scale, 0, Math.PI * 2);
          ctx.fill();

          // Distance label
          const distKm = Math.round(minDist * EARTH_RADIUS_KM);
          const midX = (obsXY.x + cpaXY.x) / 2;
          const midY = (obsXY.y + cpaXY.y) / 2;
          const cpaFs = Math.round(12 * scale);
          ctx.font = `bold ${cpaFs}px system-ui, sans-serif`;
          const label = `${distKm} km`;
          const tw = ctx.measureText(label).width;
          const pad = 6 * scale;
          const lh = 9 * scale;
          ctx.fillStyle = 'rgba(0,0,0,0.85)';
          ctx.fillRect(midX - tw / 2 - pad, midY - lh, tw + pad * 2, lh * 2);
          ctx.strokeStyle = '#ff9800';
          ctx.lineWidth = 1;
          ctx.strokeRect(midX - tw / 2 - pad, midY - lh, tw + pad * 2, lh * 2);
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, midX, midY);
          ctx.textAlign = 'left';
        }
      }

      // --- Ground-to-satellite line: observer → selected satellite current position ---
      if (state.showGroundLine && state.observer && primarySatId !== null) {
        const satPos = state.positions.get(primarySatId) ?? state.massPositions.get(primarySatId);
        if (satPos) {
          const obsXY = latLngToXY(state.observer.lat, state.observer.lng, w, h, zoom, ox, oy);
          const satXY = latLngToXY(satPos.lat, satPos.lng, w, h, zoom, ox, oy);

          // Dashed cyan line
          ctx.strokeStyle = '#4fc3f7';
          ctx.lineWidth = 2 * scale;
          ctx.setLineDash([8 * scale, 4 * scale]);
          ctx.beginPath();
          ctx.moveTo(obsXY.x, obsXY.y);
          ctx.lineTo(satXY.x, satXY.y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Slant range distance (3D straight-line distance)
          const angDist = haversineDistance(state.observer.lat, state.observer.lng, satPos.lat, satPos.lng);
          const R = EARTH_RADIUS_KM;
          const rObs = R;
          const rSat = R + satPos.alt;
          const slantKm = Math.round(Math.sqrt(rObs * rObs + rSat * rSat - 2 * rObs * rSat * Math.cos(angDist)));

          const midX = (obsXY.x + satXY.x) / 2;
          const midY = (obsXY.y + satXY.y) / 2;
          const losFs = Math.round(12 * scale);
          ctx.font = `bold ${losFs}px system-ui, sans-serif`;
          const label = `${slantKm} km`;
          const tw = ctx.measureText(label).width;
          const losPad = 6 * scale;
          const losLh = 9 * scale;
          ctx.fillStyle = 'rgba(0,0,0,0.85)';
          ctx.fillRect(midX - tw / 2 - losPad, midY - losLh, tw + losPad * 2, losLh * 2);
          ctx.strokeStyle = '#4fc3f7';
          ctx.lineWidth = 1;
          ctx.strokeRect(midX - tw / 2 - losPad, midY - losLh, tw + losPad * 2, losLh * 2);
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, midX, midY);
          ctx.textAlign = 'left';
        }
      }

      // --- Observer marker (pulsating rings like 3D globe) ---
      if (state.observer) {
        const { x, y } = latLngToXY(state.observer.lat, state.observer.lng, w, h, zoom, ox, oy);
        const t = performance.now();
        const maxRadius = 25 * scale;
        const period = 1000; // ms per ring cycle

        // Draw 3 expanding rings at different phases
        for (let i = 0; i < 3; i++) {
          const phase = ((t + i * (period / 3)) % period) / period; // 0→1
          const radius = phase * maxRadius;
          const alpha = 1 - phase;
          ctx.strokeStyle = '#ff9800';
          ctx.globalAlpha = alpha * 0.7;
          ctx.lineWidth = 2 * scale;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Center dot
        ctx.fillStyle = '#ff9800';
        ctx.beginPath();
        ctx.arc(x, y, 3 * scale, 0, Math.PI * 2);
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
    // Note: positions & massPositions intentionally excluded — the RAF loop reads
    // live state via useSatelliteStore.getState() each frame, so reactive deps would
    // only cause expensive teardown/re-setup of the animation loop every update cycle.
  }, [dimensions, imgLoaded, satellites, selectedSatIds, observer, showTrajectories, showLabels, showFlags, showBeams, beamOpacity, showLookLine, orbitPaths, nightMode]);

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
