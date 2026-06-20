'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { clampView, latLngToXY, screenToLatLng } from '@/lib/flatMapMath';

/**
 * Handles all mouse and touch interaction for FlatMapView:
 * - Mouse wheel zoom (cursor-centered)
 * - Mouse drag to pan + click detection
 * - Double-click to reset zoom
 * - Touch pinch-zoom + single-finger pan
 * - Right-click to set observer
 * - Satellite selection on click/tap
 */
export function useFlatMapInteraction(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  viewRef: React.MutableRefObject<{ zoom: number; ox: number; oy: number }>,
  dimensions: { width: number; height: number },
  selectSatellite: (id: number | null) => void,
  setObserver: (observer: { lat: number; lng: number; alt: number } | null) => void,
) {
  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    startOx: 0,
    startOy: 0,
    moved: false,
  });

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
      const _filter = state.statusFilter;
      const _info = state.satnogsInfo;
      const isVisible = (id: number) => {
        if (_filter === 'all') return true;
        const info = _info.get(id);
        const isDead = info?.status === 'dead' || info?.status === 're-entered';
        return _filter === 'dead' ? isDead : !isDead;
      };

      state.positions.forEach((pos, id) => {
        if (!isVisible(id)) return;
        const { x, y } = latLngToXY(pos.lat, pos.lng, w, h, v.zoom, v.ox, v.oy);
        const d = Math.hypot(x - mx, y - my);
        if (d < bestDist) { bestDist = d; bestId = id; }
      });

      if (bestId === null) {
        state.massPositions.forEach((pos, id) => {
          if (!isVisible(id)) return;
          const { x, y } = latLngToXY(pos.lat, pos.lng, w, h, v.zoom, v.ox, v.oy);
          const d = Math.hypot(x - mx, y - my);
          if (d < bestDist) { bestDist = d; bestId = id; }
        });
      }

      selectSatelliteRef.current(bestId);
    },
    [canvasRef, viewRef],
  );

  // Right-click — set observer
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
    [canvasRef, viewRef, setObserver],
  );

  // Mouse wheel zoom
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

      v.ox = mx - (mx - v.ox) * (newZoom / v.zoom);
      v.oy = my - (my - v.oy) * (newZoom / v.zoom);
      v.zoom = newZoom;

      clampView(v, canvas.width, canvas.height);
    };

    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, [canvasRef, viewRef, dimensions]);

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
  }, [canvasRef, viewRef, dimensions, handleSatelliteClick]);

  // Double-click to reset zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = () => {
      viewRef.current = { zoom: 1, ox: 0, oy: 0 };
    };
    canvas.addEventListener('dblclick', handler);
    return () => canvas.removeEventListener('dblclick', handler);
  }, [canvasRef, viewRef, dimensions]);

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

        const dcx = (center.x - lastTouchCenter.x) * dpr;
        const dcy = (center.y - lastTouchCenter.y) * dpr;
        v.ox += dcx;
        v.oy += dcy;

        clampView(v, canvas.width, canvas.height);
        lastTouchDist = dist;
        lastTouchCenter = center;
      } else if (e.touches.length === 1 && viewRef.current.zoom > 1) {
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
        const _filter = state.statusFilter;
        const _info = state.satnogsInfo;
        const isVisible = (id: number) => {
          if (_filter === 'all') return true;
          const info = _info.get(id);
          const isDead = info?.status === 'dead' || info?.status === 're-entered';
          return _filter === 'dead' ? isDead : !isDead;
        };

        state.positions.forEach((pos, id) => {
          if (!isVisible(id)) return;
          const { x, y } = latLngToXY(pos.lat, pos.lng, w, h, v.zoom, v.ox, v.oy);
          const d = Math.hypot(x - mx, y - my);
          if (d < bestDist) { bestDist = d; bestId = id; }
        });
        if (bestId === null) {
          state.massPositions.forEach((pos, id) => {
            if (!isVisible(id)) return;
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
  }, [canvasRef, viewRef, dimensions]);

  return { handleContextMenu };
}
