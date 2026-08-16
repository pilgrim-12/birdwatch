'use client';

import { useMemo } from 'react';
import type { SatellitePass } from '@/lib/passes';
import type { ObserverLocation, TLEData } from '@/types/satellite';
import { calculateLookAngles } from '@/lib/observer';
import { computeDopplerSeries } from '@/lib/radio/doppler';
import { computePassVisibility } from '@/lib/visibility';
import { buildPassIcs, downloadIcs } from '@/lib/ics';
import { getRadioProfile } from '@/lib/radio/radioProfiles';

const SIZE = 230;
const CENTER = SIZE / 2;
const R = 96;
const DEG = Math.PI / 180;

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

function compassPoint(azimuth: number): string {
  return COMPASS[Math.round((((azimuth % 360) + 360) % 360) / 22.5) % 16];
}

/** Sky-chart projection: zenith at the centre, horizon at the rim, north up */
function polar(azimuth: number, elevation: number): { x: number; y: number } {
  const r = ((90 - Math.max(0, elevation)) / 90) * R;
  return {
    x: CENTER + r * Math.sin(azimuth * DEG),
    y: CENTER - r * Math.cos(azimuth * DEG),
  };
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatFreq(hz: number): string {
  return hz >= 1e9 ? `${(hz / 1e9).toFixed(3)} GHz` : `${(hz / 1e6).toFixed(3)} MHz`;
}

interface PassDetailProps {
  pass: SatellitePass;
  tle: TLEData | undefined;
  observer: ObserverLocation | null;
  now: Date;
  color: string;
  onClose: () => void;
}

export function PassDetail({ pass, tle, observer, now, color, onClose }: PassDetailProps) {
  const startMs = pass.startTime.getTime();
  const endMs = pass.endTime.getTime();

  // Az/el samples across the pass
  const samples = useMemo(() => {
    if (!tle || !observer) return [];
    const steps = 80;
    const out: { t: number; az: number; el: number; range: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      const tMs = startMs + ((endMs - startMs) * i) / steps;
      const look = calculateLookAngles(tle, observer, new Date(tMs));
      if (!look) continue;
      out.push({ t: tMs, az: look.azimuth, el: look.elevation, range: look.rangeSat });
    }
    return out;
  }, [tle, observer, startMs, endMs]);

  const peak = useMemo(
    () => samples.reduce((best, s) => (s.el > best.el ? s : best), samples[0]),
    [samples],
  );
  const aos = samples[0];
  const los = samples[samples.length - 1];

  const visibility = useMemo(
    () => (tle && observer ? computePassVisibility(tle, observer, pass.startTime, pass.endTime) : null),
    [tle, observer, pass.startTime, pass.endTime],
  );

  const profile = getRadioProfile(pass.satId);
  const downlinkHz = profile?.downlinks?.[0]?.frequencyHz;

  const doppler = useMemo(() => {
    if (!tle || !observer || !downlinkHz) return [];
    return computeDopplerSeries(tle, observer, startMs, endMs, downlinkHz);
  }, [tle, observer, downlinkHz, startMs, endMs]);

  const nowMs = now.getTime();
  const isLive = nowMs >= startMs && nowMs <= endMs;
  const livePoint = useMemo(() => {
    if (!isLive || !tle || !observer) return null;
    const look = calculateLookAngles(tle, observer, now);
    return look ? { az: look.azimuth, el: look.elevation } : null;
  }, [isLive, tle, observer, now]);

  const trackPath = samples
    .filter((s) => s.el >= 0)
    .map((s, i) => {
      const p = polar(s.az, s.el);
      return `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(' ');

  const maxDoppler = doppler.reduce((m, d) => Math.max(m, Math.abs(d.shiftHz)), 0);
  const dopplerPath =
    doppler.length > 1 && maxDoppler > 0
      ? doppler
          .map((d, i) => {
            const x = ((d.t - startMs) / (endMs - startMs)) * 210 + 5;
            const y = 30 - (d.shiftHz / maxDoppler) * 24;
            return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(' ')
      : '';

  const durationMin = Math.round((endMs - startMs) / 60_000);

  const handleCalendar = () => {
    const extra: string[] = [];
    if (aos && los) {
      extra.push(`Rises ${compassPoint(aos.az)} (${aos.az.toFixed(0)}°), sets ${compassPoint(los.az)} (${los.az.toFixed(0)}°)`);
    }
    if (downlinkHz) extra.push(`Downlink: ${formatFreq(downlinkHz)}`);
    if (visibility?.visible && visibility.startTime && visibility.endTime) {
      extra.push(`Visible to the naked eye ${formatClock(visibility.startTime)}–${formatClock(visibility.endTime)}`);
    }
    downloadIcs(
      `${pass.satName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-pass.ics`,
      buildPassIcs(pass, observer, extra),
    );
  };

  return (
    <div className="absolute inset-x-4 top-16 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4 z-50 max-h-[70vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{pass.satName}</h3>
          <p className="text-[11px] text-gray-400">
            {formatClock(pass.startTime)} &ndash; {formatClock(pass.endTime)} &middot; {durationMin} min &middot; max{' '}
            <span className="text-gray-200">{pass.peakElevation.toFixed(0)}&deg;</span>
          </p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-lg leading-none shrink-0 ml-2">
          &times;
        </button>
      </div>

      {!observer || !tle ? (
        <p className="text-xs text-gray-500">Set your location to see the sky track for this pass.</p>
      ) : (
        <>
          {/* Sky chart */}
          <div className="flex flex-col sm:flex-row gap-4">
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-[230px] h-[230px] shrink-0 mx-auto sm:mx-0">
              {/* Horizon + elevation rings */}
              {[0, 30, 60].map((el) => (
                <circle
                  key={el}
                  cx={CENTER}
                  cy={CENTER}
                  r={((90 - el) / 90) * R}
                  fill={el === 0 ? 'rgba(255,255,255,0.03)' : 'none'}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth={el === 0 ? 1.5 : 1}
                  strokeDasharray={el === 0 ? undefined : '3 3'}
                />
              ))}
              {/* Cardinal cross */}
              <line x1={CENTER} y1={CENTER - R} x2={CENTER} y2={CENTER + R} stroke="rgba(255,255,255,0.1)" />
              <line x1={CENTER - R} y1={CENTER} x2={CENTER + R} y2={CENTER} stroke="rgba(255,255,255,0.1)" />
              {[
                { label: 'N', x: CENTER, y: CENTER - R - 4 },
                { label: 'S', x: CENTER, y: CENTER + R + 12 },
                { label: 'E', x: CENTER + R + 8, y: CENTER + 4 },
                { label: 'W', x: CENTER - R - 8, y: CENTER + 4 },
              ].map((c) => (
                <text key={c.label} x={c.x} y={c.y} textAnchor="middle" fontSize="10" fill="#9ca3af">
                  {c.label}
                </text>
              ))}
              <text x={CENTER + 4} y={CENTER - 4} fontSize="8" fill="#4b5563">
                90&deg;
              </text>
              <text x={CENTER + 4} y={CENTER - R / 3 - 4} fontSize="8" fill="#4b5563">
                60&deg;
              </text>
              <text x={CENTER + 4} y={CENTER - (2 * R) / 3 - 4} fontSize="8" fill="#4b5563">
                30&deg;
              </text>

              {/* Pass track */}
              {trackPath && <path d={trackPath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />}

              {/* AOS / peak / LOS markers */}
              {aos && (() => { const p = polar(aos.az, Math.max(aos.el, 0)); return (
                <g>
                  <circle cx={p.x} cy={p.y} r="4" fill="#22c55e" />
                  <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fill="#22c55e">rise</text>
                </g>
              ); })()}
              {peak && (() => { const p = polar(peak.az, peak.el); return (
                <g>
                  <circle cx={p.x} cy={p.y} r="3.5" fill="#fbbf24" />
                  <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fill="#fbbf24">
                    {peak.el.toFixed(0)}&deg;
                  </text>
                </g>
              ); })()}
              {los && (() => { const p = polar(los.az, Math.max(los.el, 0)); return (
                <g>
                  <circle cx={p.x} cy={p.y} r="4" fill="#ef4444" />
                  <text x={p.x} y={p.y + 14} textAnchor="middle" fontSize="9" fill="#ef4444">set</text>
                </g>
              ); })()}
              {livePoint && (() => { const p = polar(livePoint.az, Math.max(livePoint.el, 0)); return (
                <g>
                  <circle cx={p.x} cy={p.y} r="6" fill="none" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx={p.x} cy={p.y} r="2.5" fill="#ffffff" />
                </g>
              ); })()}
            </svg>

            {/* Numbers */}
            <div className="flex-1 min-w-0 space-y-1.5 text-xs">
              {aos && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400">Rises</span>
                  <span className="text-gray-200 font-mono">
                    {compassPoint(aos.az)} {aos.az.toFixed(0)}&deg; &middot; {formatClock(pass.startTime)}
                  </span>
                </div>
              )}
              {peak && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400">Peak</span>
                  <span className="text-gray-200 font-mono">
                    {peak.el.toFixed(0)}&deg; {compassPoint(peak.az)} &middot; {formatClock(new Date(peak.t))}
                  </span>
                </div>
              )}
              {los && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400">Sets</span>
                  <span className="text-gray-200 font-mono">
                    {compassPoint(los.az)} {los.az.toFixed(0)}&deg; &middot; {formatClock(pass.endTime)}
                  </span>
                </div>
              )}
              {peak && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400">Closest range</span>
                  <span className="text-gray-200 font-mono">{peak.range.toFixed(0)} km</span>
                </div>
              )}

              {/* Naked-eye visibility */}
              {visibility && (
                <div className="pt-1.5 border-t border-gray-700/50">
                  {visibility.visible && visibility.startTime && visibility.endTime ? (
                    <div className="text-[11px] text-amber-300">
                      &#128065; Visible to the naked eye {formatClock(visibility.startTime)}&ndash;
                      {formatClock(visibility.endTime)}
                    </div>
                  ) : (
                    <div className="text-[11px] text-gray-500">
                      Not visible &mdash;{' '}
                      {visibility.reason === 'daylight'
                        ? 'daylight at your location'
                        : visibility.reason === 'eclipsed'
                          ? "satellite is in Earth's shadow"
                          : 'pass stays too low'}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-1.5">
                <button
                  onClick={handleCalendar}
                  className="px-2 py-1 rounded text-[11px] font-medium bg-gray-700 text-gray-200 border border-gray-600 hover:bg-gray-600 transition-colors"
                  title="Download an .ics event with a 10-minute reminder"
                >
                  Add to calendar
                </button>
              </div>
            </div>
          </div>

          {/* Doppler curve */}
          {dopplerPath && downlinkHz && (
            <div className="mt-3 pt-3 border-t border-gray-700/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-gray-400">
                  Doppler on {formatFreq(downlinkHz)}
                </span>
                <span className="text-[11px] text-gray-500 font-mono">
                  &plusmn;{(maxDoppler / 1000).toFixed(1)} kHz
                </span>
              </div>
              <svg viewBox="0 0 220 60" className="w-full h-[60px]">
                <line x1="5" y1="30" x2="215" y2="30" stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
                <path d={dopplerPath} fill="none" stroke="#4ade80" strokeWidth="1.8" />
                <text x="5" y="10" fontSize="8" fill="#6b7280">+{(maxDoppler / 1000).toFixed(1)} kHz</text>
                <text x="5" y="58" fontSize="8" fill="#6b7280">-{(maxDoppler / 1000).toFixed(1)} kHz</text>
                <text x="215" y="44" fontSize="8" fill="#6b7280" textAnchor="end">LOS</text>
                <text x="5" y="44" fontSize="8" fill="#6b7280">AOS</text>
              </svg>
              <p className="text-[10px] text-gray-600 mt-0.5">
                Tune high before the pass, low after &mdash; the curve crosses zero at closest approach.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
