'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import type { Visitor, VisitorStats } from '@/types/analytics';

/** Clamp view so map edges don't go past viewport edges */
function clampView(v: { zoom: number; ox: number; oy: number }, w: number, h: number) {
  const mapW = w * v.zoom;
  const mapH = h * v.zoom;
  v.ox = Math.min(0, Math.max(w - mapW, v.ox));
  v.oy = Math.min(0, Math.max(h - mapH, v.oy));
}

/** Equirectangular projection: lat/lng → canvas pixel (with zoom/pan) */
function latLngToXY(lat: number, lng: number, w: number, h: number, zoom: number, ox: number, oy: number) {
  return {
    x: ((lng + 180) / 360) * w * zoom + ox,
    y: ((90 - lat) / 180) * h * zoom + oy,
  };
}

/** Parse User-Agent to short browser name */
function parseBrowser(ua: string | null): string {
  if (!ua) return '—';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  return 'Other';
}

/** Parse User-Agent to OS */
function parseOS(ua: string | null): string {
  if (!ua) return '—';
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Other';
}

/** Format timestamp to readable date+time */
function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  if (diffMin < 1) return `${time} (just now)`;
  if (diffMin < 60) return `${time} (${diffMin}m ago)`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${time} (${diffHr}h ago)`;
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${date} ${time}`;
}

/** Format duration in seconds to human readable */
function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === 0) return '—';
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  if (min < 60) return `${min}m ${sec}s`;
  const hr = Math.floor(min / 60);
  return `${hr}h ${min % 60}m`;
}

export default function AdminPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [stats, setStats] = useState<VisitorStats>({ today: 0, thisWeek: 0, total: 0, topCountries: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const earthImgRef = useRef<HTMLImageElement | null>(null);
  const viewRef = useRef({ zoom: 1, ox: 0, oy: 0 });
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, startOx: 0, startOy: 0, moved: false });
  const needsRedrawRef = useRef(true);

  // Get admin key from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setAdminKey(params.get('key'));
  }, []);

  // Load earth texture
  useEffect(() => {
    const img = new Image();
    img.src = '/earth-night-4k.jpg';
    img.onload = () => { earthImgRef.current = img; };
  }, []);

  // Fetch visitor data
  useEffect(() => {
    if (!adminKey) return;
    setLoading(true);
    fetch(`/api/admin/visitors?key=${encodeURIComponent(adminKey)}`)
      .then((r) => {
        if (!r.ok) throw new Error('Unauthorized');
        return r.json();
      })
      .then((data) => {
        setVisitors(data.visitors);
        setStats(data.stats);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [adminKey]);

  // Draw visitor map
  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const { zoom, ox, oy } = viewRef.current;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Background
    if (earthImgRef.current) {
      ctx.drawImage(earthImgRef.current, ox, oy, w * zoom, h * zoom);
      // Darken overlay
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = '#0a1628';
      ctx.fillRect(0, 0, w, h);
    }

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let lng = -150; lng <= 180; lng += 30) {
      const x = ((lng + 180) / 360) * w * zoom + ox;
      if (x < 0 || x > w) continue;
      ctx.beginPath(); ctx.moveTo(x, Math.max(0, oy)); ctx.lineTo(x, Math.min(h, oy + h * zoom)); ctx.stroke();
    }
    for (let lat = -60; lat <= 90; lat += 30) {
      const y = ((90 - lat) / 180) * h * zoom + oy;
      if (y < 0 || y > h) continue;
      ctx.beginPath(); ctx.moveTo(Math.max(0, ox), y); ctx.lineTo(Math.min(w, ox + w * zoom), y); ctx.stroke();
    }

    // Visitor dots
    const visitorsWithCoords = visitors.filter((v) => v.lat != null && v.lng != null);

    // Heatmap: group by approximate location
    const buckets = new Map<string, { lat: number; lng: number; count: number }>();
    for (const v of visitorsWithCoords) {
      const key = `${Math.round(v.lat! * 2) / 2},${Math.round(v.lng! * 2) / 2}`;
      const existing = buckets.get(key);
      if (existing) {
        existing.count++;
      } else {
        buckets.set(key, { lat: v.lat!, lng: v.lng!, count: 1 });
      }
    }

    // Draw glow + dot for each bucket
    for (const { lat, lng, count } of buckets.values()) {
      const { x, y } = latLngToXY(lat, lng, w, h, zoom, ox, oy);
      // Skip if outside viewport
      if (x < -50 || x > w + 50 || y < -50 || y > h + 50) continue;
      const radius = Math.min(3 + count * 1.5, 15);

      // Glow
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 3);
      gradient.addColorStop(0, 'rgba(0, 212, 255, 0.4)');
      gradient.addColorStop(1, 'rgba(0, 212, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius * 3, 0, Math.PI * 2);
      ctx.fill();

      // Dot
      ctx.fillStyle = '#00d4ff';
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Count label if > 1
      if (count > 1) {
        ctx.font = `bold ${Math.max(10, radius)}px system-ui, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(count), x, y);
      }
    }

    // Total visitors label
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`${visitorsWithCoords.length} visitors with location`, 8, 8);

    // Zoom indicator
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
  }, [visitors]);

  // Size canvas and set up RAF redraw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const sizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      viewRef.current = { zoom: 1, ox: 0, oy: 0 };
      needsRedrawRef.current = true;
    };

    sizeCanvas();

    let raf: number;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (needsRedrawRef.current) {
        needsRedrawRef.current = false;
        drawMap();
      }
    };
    loop();

    window.addEventListener('resize', sizeCanvas);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', sizeCanvas);
    };
  }, [drawMap]);

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
      const newZoom = Math.max(1, Math.min(20, v.zoom * factor));

      // Keep point under mouse fixed
      v.ox = mx - (mx - v.ox) * (newZoom / v.zoom);
      v.oy = my - (my - v.oy) * (newZoom / v.zoom);
      v.zoom = newZoom;

      clampView(v, canvas.width, canvas.height);
      needsRedrawRef.current = true;
    };

    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, [visitors]);

  // Mouse drag for panning
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
        needsRedrawRef.current = true;
      }
    };

    const handleMouseUp = () => {
      dragRef.current.dragging = false;
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [visitors]);

  // Double-click to reset zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = () => {
      viewRef.current = { zoom: 1, ox: 0, oy: 0 };
      needsRedrawRef.current = true;
    };
    canvas.addEventListener('dblclick', handler);
    return () => canvas.removeEventListener('dblclick', handler);
  }, [visitors]);

  // Touch: pinch-zoom and drag
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
        const newZoom = Math.max(1, Math.min(20, v.zoom * scale));

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
        needsRedrawRef.current = true;
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
          needsRedrawRef.current = true;
        }
      }
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
    };
  }, [visitors]);

  // No key provided
  if (adminKey === null) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-2">Access Denied</h1>
          <p className="text-gray-500">Invalid admin key</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <p className="text-gray-400">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">&larr; Back</Link>
        <h1 className="text-lg font-semibold">BirdWatch Admin</h1>
        <span className="text-xs text-gray-600 ml-auto">Last updated: {new Date().toLocaleTimeString()}</span>
      </header>

      <div className="max-w-7xl mx-auto p-4 space-y-4">
        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-2xl font-bold text-cyan-400">{stats.today}</div>
            <div className="text-xs text-gray-500 mt-1">Today</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-2xl font-bold text-green-400">{stats.thisWeek}</div>
            <div className="text-xs text-gray-500 mt-1">This Week</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-2xl font-bold text-orange-400">{stats.total}</div>
            <div className="text-xs text-gray-500 mt-1">Total</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-2xl font-bold text-purple-400">{stats.topCountries[0]?.country || '—'}</div>
            <div className="text-xs text-gray-500 mt-1">Top Country</div>
          </div>
        </div>

        {/* Map + Top Countries side by side */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Map */}
          <div ref={containerRef} className="md:col-span-3 bg-gray-900 rounded-xl border border-gray-800 overflow-hidden h-[300px] md:h-[400px]">
            <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
          </div>

          {/* Top Countries */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Top Countries</h3>
            <div className="space-y-2">
              {stats.topCountries.map((c) => (
                <div key={c.country} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{c.country}</span>
                  <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{c.count}</span>
                </div>
              ))}
              {stats.topCountries.length === 0 && (
                <p className="text-xs text-gray-600">No data yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Visitor list */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <h3 className="text-sm font-semibold text-gray-400">Recent Visitors ({visitors.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
                  <th className="px-4 py-2 font-medium">Time</th>
                  <th className="px-4 py-2 font-medium">IP</th>
                  <th className="px-4 py-2 font-medium">Location</th>
                  <th className="px-4 py-2 font-medium">Duration</th>
                  <th className="px-4 py-2 font-medium">Visits</th>
                  <th className="px-4 py-2 font-medium">Page</th>
                  <th className="px-4 py-2 font-medium">Browser</th>
                  <th className="px-4 py-2 font-medium">OS</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map((v) => (
                  <tr key={v.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-2 text-gray-400 whitespace-nowrap">{formatTime(v.created_at)}</td>
                    <td className="px-4 py-2 text-gray-300 font-mono text-xs">{v.ip}</td>
                    <td className="px-4 py-2 text-gray-300">
                      {v.city && v.country ? `${v.city}, ${v.country}` : v.country || '—'}
                    </td>
                    <td className="px-4 py-2 text-gray-400">{formatDuration(v.duration)}</td>
                    <td className="px-4 py-2 text-gray-400">{v.visit_count || 1}</td>
                    <td className="px-4 py-2 text-gray-400">{v.path || '/'}</td>
                    <td className="px-4 py-2 text-gray-400">{parseBrowser(v.user_agent)}</td>
                    <td className="px-4 py-2 text-gray-400">{parseOS(v.user_agent)}</td>
                  </tr>
                ))}
                {visitors.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-600">
                      No visitors yet. Data will appear after the first visit.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
