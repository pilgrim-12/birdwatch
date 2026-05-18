'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { parseOrbitalParams } from '@/lib/orbital';
import type { OrbitalParams } from '@/lib/orbital';
import { GROUP_COLORS, GROUP_LABELS, MASS_GROUPS } from '@/lib/constants';
import type { SatelliteGroup } from '@/lib/constants';
import type { Satellite, SatellitePosition } from '@/types/satellite';
import { RadioBadge } from '@/components/radio/RadioBadge';
import { getRadioProfile } from '@/lib/radio/radioProfiles';

// ── Layout constants ────────────────────────────────────────────────
const PAD_TOP = 40;
const PAD_BOTTOM = 50;
const PAD_LEFT = 72;
const PAD_RIGHT = 80;
const PAD_LEFT_MOBILE = 52;
const PAD_RIGHT_MOBILE = 16;

// Altitude zone boundaries (km) — use logarithmic-ish scale
const LEO_MAX = 2000;
const MEO_MAX = 20200;
const GEO_MAX = 36000;

// Give LEO more space since most satellites are there
const LEO_FRAC = 0.55;
const MEO_FRAC = 0.25;
const GEO_FRAC = 0.20;

// Altitude tick marks (km)
const ALTITUDE_TICKS = [200, 400, 600, 800, 1200, 2000, 10000, 20200, 35786];

// Dot sizing
const DOT_R = 6;
const COLLISION_PX = 14;

// ── Helpers ─────────────────────────────────────────────────────────

function formatAlt(km: number): string {
  if (km >= 1000) return `${(km / 1000).toFixed(km >= 10000 ? 0 : 1)}k`;
  return `${km}`;
}

function formatFrequency(hz: number): string {
  if (hz >= 1e9) return `${(hz / 1e9).toFixed(3)} GHz`;
  return `${(hz / 1e6).toFixed(3)} MHz`;
}

interface SatDot {
  sat: Satellite;
  params: OrbitalParams;
  altitude: number;
  color: string;
}

interface ClusterBar {
  group: string;
  label: string;
  color: string;
  count: number;
  meanAltitude: number;
}

// ── Main component ──────────────────────────────────────────────────

export default function OrbitView() {
  const isOpen = useSatelliteStore((s) => s.isOrbitViewOpen);
  const toggleOrbitView = useSatelliteStore((s) => s.toggleOrbitView);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggleOrbitView();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, toggleOrbitView]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 md:px-6 py-3 border-b border-gray-800">
        <div>
          <h2 className="text-lg font-semibold text-white">Orbit View</h2>
          <p className="text-xs text-gray-500 hidden sm:block">
            Satellite altitude distribution &middot; LEO / MEO / GEO
          </p>
        </div>
        <button
          onClick={toggleOrbitView}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors border border-gray-700"
        >
          &times;
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden relative">
        <AltitudeDiagram />
        <DetailCard />
      </div>
    </div>
  );
}

// ── Altitude Diagram ────────────────────────────────────────────────

function AltitudeDiagram() {
  const satellites = useSatelliteStore((s) => s.satellites);
  const massSatellites = useSatelliteStore((s) => s.massSatellites);
  const positions = useSatelliteStore((s) => s.positions);
  const massPositions = useSatelliteStore((s) => s.massPositions);
  const selectOrbitViewSat = useSatelliteStore((s) => s.selectOrbitViewSat);
  const selectedId = useSatelliteStore((s) => s.orbitViewSelectedSatId);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  // Measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDims({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isMobile = dims.w < 640;
  const padL = isMobile ? PAD_LEFT_MOBILE : PAD_LEFT;
  const padR = isMobile ? PAD_RIGHT_MOBILE : PAD_RIGHT;

  // Parse orbital params for all satellites
  const orbitalMap = useMemo(() => {
    const map = new Map<number, OrbitalParams>();
    for (const sat of [...satellites, ...massSatellites]) {
      try {
        map.set(sat.id, parseOrbitalParams(sat.tle.line1, sat.tle.line2));
      } catch {
        // Skip invalid TLE
      }
    }
    return map;
  }, [satellites, massSatellites]);

  // Build individual dots (non-mass) and cluster bars (mass)
  const { dots, clusters } = useMemo(() => {
    const dots: SatDot[] = [];
    const clusterMap = new Map<string, { sats: Satellite[]; altSum: number }>();

    const allSats = [...satellites, ...massSatellites];
    for (const sat of allSats) {
      const params = orbitalMap.get(sat.id);
      if (!params) continue;

      const isMassGroup = MASS_GROUPS.includes(sat.group as SatelliteGroup);
      const pos = positions.get(sat.id) ?? massPositions.get(sat.id);
      const altitude = pos ? pos.alt : (params.apogee + params.perigee) / 2;
      const color = GROUP_COLORS[sat.group as SatelliteGroup] || '#00d4ff';

      if (isMassGroup) {
        const existing = clusterMap.get(sat.group);
        if (existing) {
          existing.sats.push(sat);
          existing.altSum += altitude;
        } else {
          clusterMap.set(sat.group, { sats: [sat], altSum: altitude });
        }
      } else {
        dots.push({ sat, params, altitude, color });
      }
    }

    const clusters: ClusterBar[] = [];
    for (const [group, data] of clusterMap) {
      clusters.push({
        group,
        label: GROUP_LABELS[group as SatelliteGroup] ?? group,
        color: GROUP_COLORS[group as SatelliteGroup] || '#00d4ff',
        count: data.sats.length,
        meanAltitude: data.altSum / data.sats.length,
      });
    }

    return { dots, clusters };
  }, [satellites, massSatellites, orbitalMap, positions, massPositions]);

  // Drawing area
  const drawTop = PAD_TOP;
  const drawBottom = dims.h - PAD_BOTTOM;
  const drawHeight = Math.max(drawBottom - drawTop, 1);
  const drawLeft = padL;
  const drawRight = dims.w - padR;
  const drawWidth = Math.max(drawRight - drawLeft, 1);

  // Zone pixel boundaries
  const geoTop = drawTop;
  const geoBottom = drawTop + drawHeight * GEO_FRAC;
  const meoTop = geoBottom;
  const meoBottom = meoTop + drawHeight * MEO_FRAC;
  const leoTop = meoBottom;
  const leoBottom = drawBottom;

  const altitudeToY = useCallback(
    (altKm: number): number => {
      if (altKm >= MEO_MAX) {
        const t = Math.min((altKm - MEO_MAX) / (GEO_MAX - MEO_MAX), 1);
        return geoBottom - t * (geoBottom - geoTop);
      } else if (altKm >= LEO_MAX) {
        const t = (altKm - LEO_MAX) / (MEO_MAX - LEO_MAX);
        return meoBottom - t * (meoBottom - meoTop);
      } else {
        const t = Math.max(0, altKm - 150) / (LEO_MAX - 150);
        return leoBottom - t * (leoBottom - leoTop);
      }
    },
    [geoTop, geoBottom, meoTop, meoBottom, leoTop, leoBottom],
  );

  // Spread dots horizontally to avoid overlap
  const dotPositions = useMemo(() => {
    const sorted = [...dots].sort((a, b) => a.altitude - b.altitude);
    const groups: SatDot[][] = [];
    let currentGroup: SatDot[] = [];

    for (const dot of sorted) {
      const y = altitudeToY(dot.altitude);
      if (
        currentGroup.length > 0 &&
        Math.abs(y - altitudeToY(currentGroup[0].altitude)) > COLLISION_PX
      ) {
        groups.push(currentGroup);
        currentGroup = [];
      }
      currentGroup.push(dot);
    }
    if (currentGroup.length > 0) groups.push(currentGroup);

    const result: { dot: SatDot; x: number; y: number }[] = [];
    for (const group of groups) {
      const n = group.length;
      const spacing = Math.min(drawWidth / (n + 1), 40);
      const totalW = spacing * (n - 1);
      const startX = drawLeft + (drawWidth - totalW) / 2;
      for (let i = 0; i < n; i++) {
        result.push({
          dot: group[i],
          x: startX + spacing * i,
          y: altitudeToY(group[i].altitude),
        });
      }
    }
    return result;
  }, [dots, drawLeft, drawWidth, altitudeToY]);

  // Hovered satellite data for tooltip
  const hoveredDot = hoveredId
    ? dotPositions.find((d) => d.dot.sat.id === hoveredId)
    : null;

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  return (
    <div ref={containerRef} className="flex-1 relative overflow-hidden">
      <svg
        width={dims.w}
        height={dims.h}
        className="absolute inset-0"
        onMouseMove={handleMouseMove}
      >
        <defs>
          <linearGradient id="leoGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0.03" />
          </linearGradient>
          <linearGradient id="meoGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b1f5e" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#3b1f5e" stopOpacity="0.03" />
          </linearGradient>
          <linearGradient id="geoGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5e3b1f" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#5e3b1f" stopOpacity="0.03" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Zone backgrounds with gradients */}
        <rect x={drawLeft} y={leoTop} width={drawWidth} height={leoBottom - leoTop} fill="url(#leoGrad)" />
        <rect x={drawLeft} y={meoTop} width={drawWidth} height={meoBottom - meoTop} fill="url(#meoGrad)" />
        <rect x={drawLeft} y={geoTop} width={drawWidth} height={geoBottom - geoTop} fill="url(#geoGrad)" />

        {/* Zone divider lines */}
        <line x1={drawLeft} y1={meoBottom} x2={drawRight} y2={meoBottom} stroke="#374151" strokeWidth={0.5} />
        <line x1={drawLeft} y1={geoBottom} x2={drawRight} y2={geoBottom} stroke="#374151" strokeWidth={0.5} />

        {/* Zone labels (right side) — desktop only */}
        {!isMobile && (
          <>
            <text x={drawRight + 14} y={(leoTop + leoBottom) / 2} fill="#3b82f6" fontSize={13} fontWeight={700} dominantBaseline="middle" opacity={0.6}>
              LEO
            </text>
            <text x={drawRight + 14} y={(leoTop + leoBottom) / 2 + 16} fill="#6b7280" fontSize={9} dominantBaseline="middle">
              200–2,000 km
            </text>
            <text x={drawRight + 14} y={(meoTop + meoBottom) / 2} fill="#8b5cf6" fontSize={13} fontWeight={700} dominantBaseline="middle" opacity={0.6}>
              MEO
            </text>
            <text x={drawRight + 14} y={(meoTop + meoBottom) / 2 + 16} fill="#6b7280" fontSize={9} dominantBaseline="middle">
              2,000–20,200 km
            </text>
            <text x={drawRight + 14} y={(geoTop + geoBottom) / 2} fill="#f59e0b" fontSize={13} fontWeight={700} dominantBaseline="middle" opacity={0.6}>
              GEO
            </text>
            <text x={drawRight + 14} y={(geoTop + geoBottom) / 2 + 16} fill="#6b7280" fontSize={9} dominantBaseline="middle">
              ~35,786 km
            </text>
          </>
        )}

        {/* Altitude tick marks & grid lines */}
        {ALTITUDE_TICKS.map((alt) => {
          const y = altitudeToY(alt);
          if (y < drawTop || y > drawBottom) return null;
          return (
            <g key={alt}>
              <line x1={drawLeft} y1={y} x2={drawRight} y2={y} stroke="#374151" strokeWidth={0.3} strokeDasharray="4,6" />
              <text x={drawLeft - 8} y={y} textAnchor="end" fill="#6b7280" fontSize={isMobile ? 8 : 10} dominantBaseline="middle">
                {formatAlt(alt)} km
              </text>
            </g>
          );
        })}

        {/* Earth surface representation */}
        <rect x={drawLeft} y={drawBottom} width={drawWidth} height={PAD_BOTTOM - 10} rx={4} fill="#0f2942" stroke="#1e4976" strokeWidth={0.5} />
        <text x={dims.w / 2} y={drawBottom + (PAD_BOTTOM - 10) / 2} textAnchor="middle" dominantBaseline="middle" fill="#3b82f6" fontSize={11} fontWeight={600} opacity={0.5}>
          Earth Surface
        </text>

        {/* Mass group cluster bars */}
        {clusters.map((cl) => {
          const y = altitudeToY(cl.meanAltitude);
          return (
            <g key={cl.group}>
              <rect x={drawLeft + 20} y={y - 8} width={drawWidth - 40} height={16} rx={8} fill={cl.color} fillOpacity={0.1} stroke={cl.color} strokeWidth={1} strokeOpacity={0.3} />
              <text x={drawLeft + drawWidth / 2} y={y + 4} textAnchor="middle" fill={cl.color} fontSize={11} fontWeight={600}>
                {cl.label} ({cl.count.toLocaleString()})
              </text>
            </g>
          );
        })}

        {/* Individual satellite dots with names */}
        {dotPositions.map(({ dot, x, y }) => {
          const isHovered = hoveredId === dot.sat.id;
          const isSelected = selectedId === dot.sat.id;
          const showLabel = isHovered || isSelected || dotPositions.length <= 60;
          return (
            <g
              key={dot.sat.id}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredId(dot.sat.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => selectOrbitViewSat(dot.sat.id)}
            >
              {/* Glow ring for selected */}
              {isSelected && (
                <circle cx={x} cy={y} r={DOT_R + 5} fill="none" stroke={dot.color} strokeWidth={1.5} opacity={0.4} filter="url(#glow)" />
              )}
              <circle
                cx={x}
                cy={y}
                r={isHovered || isSelected ? DOT_R + 2 : DOT_R}
                fill={dot.color}
                fillOpacity={0.9}
                stroke={isSelected ? '#fff' : isHovered ? '#cbd5e1' : dot.color}
                strokeWidth={isSelected ? 2 : isHovered ? 1.5 : 0.5}
                strokeOpacity={isSelected || isHovered ? 1 : 0.3}
              />
              {/* Satellite name label */}
              {showLabel && (
                <text
                  x={x}
                  y={y - DOT_R - 4}
                  textAnchor="middle"
                  fill={isSelected ? '#fff' : isHovered ? '#e2e8f0' : '#9ca3af'}
                  fontSize={isSelected || isHovered ? 10 : 8}
                  fontWeight={isSelected ? 600 : 400}
                >
                  {dot.sat.name.length > 16 ? dot.sat.name.slice(0, 14) + '..' : dot.sat.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredDot && (
        <div
          className="absolute pointer-events-none bg-gray-800/95 border border-gray-600 rounded-lg px-3 py-2 text-xs text-white shadow-xl z-10 backdrop-blur-sm"
          style={{
            left: Math.min(mouse.x + 16, dims.w - 220),
            top: Math.max(mouse.y - 60, 8),
          }}
        >
          <div className="font-semibold text-sm">{hoveredDot.dot.sat.name}</div>
          <div className="text-gray-400 mt-1 space-y-0.5">
            <div>{hoveredDot.dot.altitude.toFixed(0)} km &middot; {hoveredDot.dot.params.orbitType}</div>
            <div>{GROUP_LABELS[hoveredDot.dot.sat.group as SatelliteGroup] ?? hoveredDot.dot.sat.group}</div>
            <div>Incl: {hoveredDot.dot.params.inclination.toFixed(1)}&deg; &middot; Ecc: {hoveredDot.dot.params.eccentricity.toFixed(4)}</div>
            <div>Period: {hoveredDot.dot.params.period.toFixed(1)} min</div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-400 bg-gray-900/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-700/50">
        {[...new Set(dots.map((d) => d.sat.group))].map((group) => (
          <span key={group} className="flex items-center gap-1">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: GROUP_COLORS[group as SatelliteGroup] || '#00d4ff' }}
            />
            {GROUP_LABELS[group as SatelliteGroup] ?? group}
          </span>
        ))}
        <span className="text-gray-600 ml-1">&middot; {dots.length} satellites</span>
      </div>
    </div>
  );
}

// ── Detail Card ─────────────────────────────────────────────────────

function DetailCard() {
  const satId = useSatelliteStore((s) => s.orbitViewSelectedSatId);
  const selectOrbitViewSat = useSatelliteStore((s) => s.selectOrbitViewSat);
  const satellites = useSatelliteStore((s) => s.satellites);
  const massSatellites = useSatelliteStore((s) => s.massSatellites);
  const positions = useSatelliteStore((s) => s.positions);
  const massPositions = useSatelliteStore((s) => s.massPositions);

  const sat = useMemo(() => {
    if (satId === null) return null;
    return (
      satellites.find((s) => s.id === satId) ??
      massSatellites.find((s) => s.id === satId) ??
      null
    );
  }, [satId, satellites, massSatellites]);

  const params = useMemo(() => {
    if (!sat) return null;
    try {
      return parseOrbitalParams(sat.tle.line1, sat.tle.line2);
    } catch {
      return null;
    }
  }, [sat]);

  const position: SatellitePosition | undefined = useMemo(() => {
    if (satId === null) return undefined;
    return positions.get(satId) ?? massPositions.get(satId);
  }, [satId, positions, massPositions]);

  const radioProfile = useMemo(() => {
    if (satId === null) return null;
    return getRadioProfile(satId);
  }, [satId]);

  if (!sat || !params) return null;

  const groupLabel = GROUP_LABELS[sat.group as SatelliteGroup] ?? sat.group;
  const groupColor = GROUP_COLORS[sat.group as SatelliteGroup] || '#00d4ff';
  const currentAlt = position?.alt ?? (params.apogee + params.perigee) / 2;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 md:relative md:w-80 shrink-0 border-l border-gray-800 bg-gray-900 overflow-y-auto p-4 z-10 shadow-2xl md:shadow-none">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{sat.name}</h3>
          <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
            <span
              className="w-2 h-2 rounded-full inline-block shrink-0"
              style={{ backgroundColor: groupColor }}
            />
            NORAD {sat.id} &middot; {groupLabel}
          </p>
        </div>
        <button
          onClick={() => selectOrbitViewSat(null)}
          className="text-gray-400 hover:text-white text-lg leading-none shrink-0"
        >
          &times;
        </button>
      </div>

      {/* Orbit type badge */}
      <div className="mb-4">
        <span
          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
            params.orbitType === 'LEO'
              ? 'bg-blue-500/15 text-blue-400'
              : params.orbitType === 'MEO'
                ? 'bg-purple-500/15 text-purple-400'
                : params.orbitType === 'GEO'
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'bg-red-500/15 text-red-400'
          }`}
        >
          {params.orbitType}
          {params.orbitType === 'LEO' && ' — Low Earth Orbit'}
          {params.orbitType === 'MEO' && ' — Medium Earth Orbit'}
          {params.orbitType === 'GEO' && ' — Geostationary'}
          {params.orbitType === 'HEO' && ' — Highly Elliptical'}
        </span>
      </div>

      {/* Orbit section */}
      <Section title="Orbit">
        <Row label="Altitude" value={`${currentAlt.toFixed(0)} km`} />
        {position && <Row label="Velocity" value={`${position.velocity.toFixed(2)} km/s`} />}
        <Row label="Inclination" value={`${params.inclination.toFixed(1)}\u00B0`} />
        <Row label="Eccentricity" value={params.eccentricity.toFixed(6)} />
        <Row label="Period" value={`${params.period.toFixed(1)} min`} />
        <Row label="Apogee" value={`${params.apogee.toFixed(0)} km`} />
        <Row label="Perigee" value={`${params.perigee.toFixed(0)} km`} />
        <Row label="Semi-major axis" value={`${params.semiMajorAxis.toFixed(0)} km`} />
        <Row label="RAAN" value={`${params.raan.toFixed(1)}\u00B0`} />
        <Row label="Arg. Perigee" value={`${params.argPerigee.toFixed(1)}\u00B0`} />
        <Row label="Mean Anomaly" value={`${params.meanAnomaly.toFixed(1)}\u00B0`} />
      </Section>

      {/* TLE Epoch */}
      <Section title="TLE Data">
        <Row
          label="Epoch"
          value={params.epoch.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        />
        <Row label="B* Drag" value={params.bstar.toExponential(4)} />
        <Row label="Mean Motion" value={`${params.meanMotion.toFixed(8)} rev/day`} />
      </Section>

      {/* Position section */}
      {position && (
        <Section title="Current Position">
          <Row label="Latitude" value={`${position.lat.toFixed(4)}\u00B0`} />
          <Row label="Longitude" value={`${position.lng.toFixed(4)}\u00B0`} />
          <Row label="Altitude" value={`${position.alt.toFixed(1)} km`} />
        </Section>
      )}

      {/* Radio section */}
      {radioProfile && (
        <Section title="Radio">
          <div className="flex items-center gap-2 mb-2">
            <RadioBadge noradId={sat.id} group={sat.group} />
            <span
              className={`text-[10px] font-medium ${
                radioProfile.difficulty === 'easy'
                  ? 'text-green-400'
                  : radioProfile.difficulty === 'medium'
                    ? 'text-yellow-400'
                    : radioProfile.difficulty === 'hard'
                      ? 'text-orange-400'
                      : 'text-red-400'
              }`}
            >
              {radioProfile.difficulty}
            </span>
          </div>
          <p className="text-[10px] text-gray-400 mb-1">{radioProfile.antenna}</p>
          <p className="text-[10px] text-gray-400 mb-2">{radioProfile.whatYouReceive}</p>
          {radioProfile.downlinks.map((dl, i) => (
            <div key={i} className="text-[10px] text-gray-500">
              {formatFrequency(dl.frequencyHz)} &middot; {dl.mode.replace(/_/g, ' ')}
              {dl.description && ` — ${dl.description}`}
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

// ── Shared small components ─────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-800 pb-1">
        {title}
      </h4>
      <dl className="space-y-1">{children}</dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-xs">
      <dt className="text-gray-400">{label}</dt>
      <dd className="text-white font-mono">{String(value)}</dd>
    </div>
  );
}
