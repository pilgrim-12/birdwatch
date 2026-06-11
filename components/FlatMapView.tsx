'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { computeOrbitPath } from '@/lib/orbit';
import { GROUP_COLORS } from '@/lib/constants';
import type { SatelliteGroup } from '@/lib/constants';
import { loadFlagImages } from '@/lib/countryFlags';
import { useFlatMapInteraction } from '@/hooks/useFlatMapInteraction';
import {
  drawGrid,
  drawFootprints,
  drawOrbits,
  drawBeams,
  drawMassDots,
  drawSatelliteDots,
  drawLabelsAndFlags,
  drawSelectedNames,
  drawCpaLine,
  drawGroundLine,
  drawObserverMarker,
  drawGroundStations,
  drawZoomIndicator,
} from '@/lib/flatMapDraw';

export default function FlatMapView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // View state (zoom + pan) — refs to avoid re-renders in RAF loop
  const viewRef = useRef({ zoom: 1, ox: 0, oy: 0 });

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
    return () => { img.onload = null; };
  }, [nightMode]);

  // Store selectors
  const satellites = useSatelliteStore((s) => s.satellites);
  const selectedSatIds = useSatelliteStore((s) => s.selectedSatIds);
  const selectSatellite = useSatelliteStore((s) => s.selectSatellite);
  const observer = useSatelliteStore((s) => s.observer);
  const setObserver = useSatelliteStore((s) => s.setObserver);
  const showTrajectories = useSatelliteStore((s) => s.showTrajectories);
  const showLabels = useSatelliteStore((s) => s.showLabels);
  const showFlags = useSatelliteStore((s) => s.showFlags);
  const showBeams = useSatelliteStore((s) => s.showBeams);

  // Preload flag images for canvas rendering
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

  // Reset view when dimensions change
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

  // Extracted interaction handling (mouse, touch, zoom, pan)
  const { handleContextMenu } = useFlatMapInteraction(
    canvasRef, viewRef, dimensions, selectSatellite, setObserver,
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
      const v = viewRef.current;

      // Clear + background
      ctx.clearRect(0, 0, w, h);
      if (earthImgRef.current) {
        ctx.drawImage(earthImgRef.current, v.ox, v.oy, w * v.zoom, h * v.zoom);
      } else {
        ctx.fillStyle = '#0a1628';
        ctx.fillRect(0, 0, w, h);
      }

      drawGrid(ctx, w, h, v);

      // Footprint circles for selected satellites
      if (state.showFootprint && state.selectedSatIds.length > 0) {
        const satGroupMap = new Map(satellites.map((s) => [s.id, s]));
        const massSats = useSatelliteStore.getState().massSatellites;
        drawFootprints(ctx, w, h, v, state.selectedSatIds, state.positions, state.massPositions, satGroupMap, massSats);
      }

      // Orbit ground tracks
      if (state.showTrajectories || state.selectedSatIds.length > 0) {
        drawOrbits(ctx, w, h, v, orbitPaths, state.selectedSatIds, state.showTrajectories);
      }

      // Satellite lookup map (shared by beams, dots, labels)
      const satGroupMap = new Map(satellites.map((s) => [s.id, s]));

      // Beams
      if (state.showBeams) {
        drawBeams(ctx, w, h, v, state.positions, satGroupMap, state.beamOpacity);
      }

      // Zoom-aware scale factor
      const zs = Math.min(Math.max(v.zoom, 1), 12);
      const scale = 0.6 + zs * 0.4;

      // Mass satellite dots
      drawMassDots(ctx, w, h, v, state.massPositions, scale);

      // Normal satellite dots
      drawSatelliteDots(ctx, w, h, v, state.positions, satGroupMap, state.selectedSatIds, scale);

      // Labels & Flags
      if (state.showLabels || state.showFlags) {
        drawLabelsAndFlags(ctx, w, h, v, state.positions, satGroupMap, state.selectedSatIds, scale, state.showLabels, state.showFlags, flagImagesRef.current);
      }

      // Selected satellite names (always show if selected, even when labels off)
      if (state.selectedSatIds.length > 0 && !state.showLabels) {
        const massSats = useSatelliteStore.getState().massSatellites;
        drawSelectedNames(ctx, w, h, v, state.selectedSatIds, state.positions, state.massPositions, satGroupMap, massSats, scale);
      }

      // CPA look-line
      const primarySatId = state.selectedSatIds.length > 0 ? state.selectedSatIds[0] : null;
      if (state.showLookLine && state.observer && primarySatId !== null) {
        const massSats = useSatelliteStore.getState().massSatellites;
        drawCpaLine(ctx, w, h, v, state.observer, primarySatId, orbitPaths, massSats, scale);
      }

      // Ground-to-satellite line
      if (state.showGroundLine && state.observer && primarySatId !== null) {
        const satPos = state.positions.get(primarySatId) ?? state.massPositions.get(primarySatId);
        if (satPos) {
          drawGroundLine(ctx, w, h, v, state.observer, satPos, scale);
        }
      }

      // Ground stations
      if (state.showGroundStations && state.groundStations.length > 0) {
        drawGroundStations(ctx, w, h, v, state.groundStations, scale);
      }

      // Observer marker
      if (state.observer) {
        drawObserverMarker(ctx, w, h, v, state.observer, scale);
      }

      // Zoom indicator
      drawZoomIndicator(ctx, w, v.zoom);
    }

    draw();
    return () => cancelAnimationFrame(raf);
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
