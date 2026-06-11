import { GROUP_COLORS, GROUP_INFO } from '@/lib/constants';
import type { SatelliteGroup } from '@/lib/constants';
import { latLngToXY } from '@/lib/flatMapMath';
import { computeFootprintCircle } from '@/lib/footprint';
import { computeCPA, computeSlantRange } from '@/lib/orbitAnalysis';
import { computeOrbitPath } from '@/lib/orbit';
import { getGroupPrimaryIsoCode } from '@/lib/countryFlags';
import type { Satellite, SatellitePosition } from '@/types/satellite';

interface ViewState {
  zoom: number;
  ox: number;
  oy: number;
}

interface OrbitPath {
  id: number;
  group: string;
  color: string;
  points: { lat: number; lng: number; alt: number }[];
}

/** Draw latitude/longitude grid lines */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  { zoom, ox, oy }: ViewState,
) {
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
}

/** Draw footprint circles for selected satellites */
export function drawFootprints(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  v: ViewState,
  selectedSatIds: number[],
  positions: Map<number, SatellitePosition>,
  massPositions: Map<number, SatellitePosition>,
  satGroupMap: Map<number, Satellite>,
  massSatellites: Satellite[],
) {
  for (const selId of selectedSatIds) {
    const pos = positions.get(selId) ?? massPositions.get(selId);
    if (!pos) continue;
    const sat = satGroupMap.get(selId)
      ?? massSatellites.find((s) => s.id === selId);
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
      const { x: px, y: py } = latLngToXY(pLat, pLng, w, h, v.zoom, v.ox, v.oy);
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
      const { x: px, y: py } = latLngToXY(pLat, pLng, w, h, v.zoom, v.ox, v.oy);
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

/** Draw orbit ground tracks */
export function drawOrbits(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  v: ViewState,
  orbitPaths: OrbitPath[],
  selectedSatIds: number[],
  showTrajectories: boolean,
) {
  for (const orbit of orbitPaths) {
    const isSelected = selectedSatIds.includes(orbit.id);
    if (!showTrajectories && !isSelected) continue;
    ctx.strokeStyle = isSelected ? orbit.color : orbit.color + '70';
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.beginPath();
    let penDown = false;
    for (let i = 0; i < orbit.points.length; i++) {
      const { x, y } = latLngToXY(orbit.points[i].lat, orbit.points[i].lng, w, h, v.zoom, v.ox, v.oy);
      if (i > 0 && Math.abs(orbit.points[i].lng - orbit.points[i - 1].lng) > 180) {
        ctx.stroke();
        ctx.beginPath();
        penDown = false;
      }
      if (!penDown) { ctx.moveTo(x, y); penDown = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

/** Draw beam circles at satellite positions */
export function drawBeams(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  v: ViewState,
  positions: Map<number, SatellitePosition>,
  satGroupMap: Map<number, Satellite>,
  beamOpacity: number,
) {
  const alpha = beamOpacity / 100;
  positions.forEach((pos, id) => {
    const sat = satGroupMap.get(id);
    if (!sat) return;
    const color = GROUP_COLORS[sat.group as SatelliteGroup] || '#00d4ff';
    const { x, y } = latLngToXY(pos.lat, pos.lng, w, h, v.zoom, v.ox, v.oy);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha * 0.5;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

/** Draw mass satellite dots (Starlink, etc.) */
export function drawMassDots(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  v: ViewState,
  massPositions: Map<number, SatellitePosition>,
  scale: number,
) {
  const massColor = GROUP_COLORS.starlink;
  ctx.fillStyle = massColor;
  ctx.globalAlpha = 0.85;
  const dotSize = Math.round(2 * scale);
  massPositions.forEach((pos) => {
    const { x, y } = latLngToXY(pos.lat, pos.lng, w, h, v.zoom, v.ox, v.oy);
    if (x < -2 || x > w + 2 || y < -2 || y > h + 2) return;
    ctx.fillRect(x - dotSize / 2, y - dotSize / 2, dotSize, dotSize);
  });
  ctx.globalAlpha = 1;
}

/** Draw normal satellite dots (circles for regular, diamonds for stations) */
export function drawSatelliteDots(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  v: ViewState,
  positions: Map<number, SatellitePosition>,
  satGroupMap: Map<number, Satellite>,
  selectedSatIds: number[],
  scale: number,
) {
  positions.forEach((pos, id) => {
    const sat = satGroupMap.get(id);
    if (!sat) return;
    const color = GROUP_COLORS[sat.group as SatelliteGroup] || '#00d4ff';
    const isSelected = selectedSatIds.includes(id);
    const isStation = sat.group === 'stations';
    const { x, y } = latLngToXY(pos.lat, pos.lng, w, h, v.zoom, v.ox, v.oy);

    const margin = 12 * scale;
    if (x < -margin || x > w + margin || y < -margin || y > h + margin) return;

    ctx.fillStyle = isSelected ? '#ffffff' : color;

    if (isStation) {
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
}

/** Draw satellite name labels and country flags */
export function drawLabelsAndFlags(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  v: ViewState,
  positions: Map<number, SatellitePosition>,
  satGroupMap: Map<number, Satellite>,
  selectedSatIds: number[],
  scale: number,
  showLabels: boolean,
  showFlags: boolean,
  flagCache: Map<string, HTMLImageElement>,
) {
  const fontSize = Math.round(10 * scale);
  ctx.font = `${fontSize}px system-ui, sans-serif`;
  ctx.textBaseline = 'bottom';
  const flagW = Math.round(14 * scale);
  const flagH = Math.round(10 * scale);
  positions.forEach((pos, id) => {
    const sat = satGroupMap.get(id);
    if (!sat) return;
    const isSelected = selectedSatIds.includes(id);
    const { x, y } = latLngToXY(pos.lat, pos.lng, w, h, v.zoom, v.ox, v.oy);
    if (x < -50 || x > w + 50 || y < -20 || y > h + 20) return;
    let offsetX = x + 6 * scale;
    if (showFlags) {
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
    if (showLabels) {
      ctx.fillStyle = isSelected ? '#ffffff' : '#cccccc';
      ctx.globalAlpha = isSelected ? 1 : 0.7;
      ctx.fillText(sat.name, offsetX, y - 2 * scale);
    }
  });
  ctx.globalAlpha = 1;
}

/** Draw selected satellite names when labels are globally off */
export function drawSelectedNames(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  v: ViewState,
  selectedSatIds: number[],
  positions: Map<number, SatellitePosition>,
  massPositions: Map<number, SatellitePosition>,
  satGroupMap: Map<number, Satellite>,
  massSatellites: Satellite[],
  scale: number,
) {
  for (const selId of selectedSatIds) {
    const pos = positions.get(selId) ?? massPositions.get(selId);
    const sat = satGroupMap.get(selId) ?? massSatellites.find((s) => s.id === selId);
    if (pos && sat) {
      const { x, y } = latLngToXY(pos.lat, pos.lng, w, h, v.zoom, v.ox, v.oy);
      const fontSize = Math.round(11 * scale);
      ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(sat.name, x + 8 * scale, y - 4 * scale);
    }
  }
}

/** Draw CPA look-line from observer to closest orbit point */
export function drawCpaLine(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  v: ViewState,
  observer: { lat: number; lng: number },
  primarySatId: number,
  orbitPaths: OrbitPath[],
  massSatellites: Satellite[],
  scale: number,
) {
  let cpaPoints = orbitPaths.find((o) => o.id === primarySatId)?.points;
  if (!cpaPoints) {
    const massSat = massSatellites.find((s) => s.id === primarySatId);
    if (massSat) {
      cpaPoints = computeOrbitPath(massSat.tle, new Date(), 60);
    }
  }
  if (!cpaPoints || cpaPoints.length === 0) return;

  const cpa = computeCPA(observer, cpaPoints);
  if (!cpa) return;

  const obsXY = latLngToXY(observer.lat, observer.lng, w, h, v.zoom, v.ox, v.oy);
  const cpaXY = latLngToXY(cpa.closest.lat, cpa.closest.lng, w, h, v.zoom, v.ox, v.oy);

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
  drawDistanceLabel(ctx, obsXY, cpaXY, `${cpa.distKm} km`, '#ff9800', scale);
}

/** Draw ground-to-satellite line with slant range */
export function drawGroundLine(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  v: ViewState,
  observer: { lat: number; lng: number },
  satPos: SatellitePosition,
  scale: number,
) {
  const obsXY = latLngToXY(observer.lat, observer.lng, w, h, v.zoom, v.ox, v.oy);
  const satXY = latLngToXY(satPos.lat, satPos.lng, w, h, v.zoom, v.ox, v.oy);

  // Dashed cyan line
  ctx.strokeStyle = '#4fc3f7';
  ctx.lineWidth = 2 * scale;
  ctx.setLineDash([8 * scale, 4 * scale]);
  ctx.beginPath();
  ctx.moveTo(obsXY.x, obsXY.y);
  ctx.lineTo(satXY.x, satXY.y);
  ctx.stroke();
  ctx.setLineDash([]);

  const result = computeSlantRange(observer, satPos);
  drawDistanceLabel(ctx, obsXY, satXY, `${result.slantKm} km`, '#4fc3f7', scale);
}

/** Draw a labeled distance tag at the midpoint between two screen points */
function drawDistanceLabel(
  ctx: CanvasRenderingContext2D,
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  label: string,
  color: string,
  scale: number,
) {
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;
  const fs = Math.round(12 * scale);
  ctx.font = `bold ${fs}px system-ui, sans-serif`;
  const tw = ctx.measureText(label).width;
  const pad = 6 * scale;
  const lh = 9 * scale;
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(midX - tw / 2 - pad, midY - lh, tw + pad * 2, lh * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(midX - tw / 2 - pad, midY - lh, tw + pad * 2, lh * 2);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, midX, midY);
  ctx.textAlign = 'left';
}

/** Draw pulsating observer marker rings */
export function drawObserverMarker(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  v: ViewState,
  observer: { lat: number; lng: number },
  scale: number,
) {
  const { x, y } = latLngToXY(observer.lat, observer.lng, w, h, v.zoom, v.ox, v.oy);
  const t = performance.now();
  const maxRadius = 25 * scale;
  const period = 1000;

  for (let i = 0; i < 3; i++) {
    const phase = ((t + i * (period / 3)) % period) / period;
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

  ctx.fillStyle = '#ff9800';
  ctx.beginPath();
  ctx.arc(x, y, 3 * scale, 0, Math.PI * 2);
  ctx.fill();
}

/** Draw zoom indicator in corner */
export function drawZoomIndicator(
  ctx: CanvasRenderingContext2D,
  w: number,
  zoom: number,
) {
  if (zoom <= 1.05) return;
  const label = `${zoom.toFixed(1)}x`;
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  const tw = ctx.measureText(label).width;
  ctx.fillRect(w - tw - 16, 8, tw + 12, 20);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, w - tw - 10, 18);
}
