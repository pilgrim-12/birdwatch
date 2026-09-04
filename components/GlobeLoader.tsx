'use client';

import { useEffect, useState } from 'react';

/** Which part of the first paint we are still waiting on. */
export type LoadStage = 'engine' | 'textures' | 'satellites';

const STEPS: { key: LoadStage; label: string }[] = [
  { key: 'engine', label: 'Starting the 3D engine' },
  { key: 'textures', label: 'Loading Earth and star maps' },
  { key: 'satellites', label: 'Fetching satellite orbits' },
];

/**
 * First-paint overlay for the globe.
 *
 * The 3D bundle and the 4K textures take a few seconds on a cold cache, and
 * until they land the viewport is an empty black rectangle that reads as a
 * broken app. This says what is happening and how far along it is, then fades
 * itself out once the caller reports `done`.
 */
export default function GlobeLoader({ stage, done }: { stage: LoadStage; done: boolean }) {
  const [hidden, setHidden] = useState(false);
  const [slow, setSlow] = useState(false);

  // Remove from the tree only after the fade, so the transition can play.
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setHidden(true), 500);
    return () => clearTimeout(t);
  }, [done]);

  // A cold cache pulls megabytes of imagery — say so before the wait feels stuck.
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 5000);
    return () => clearTimeout(t);
  }, []);

  if (hidden) return null;

  const activeIndex = STEPS.findIndex((s) => s.key === stage);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading the globe"
      className={`absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-gray-950 transition-opacity duration-500 ${
        done ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      {/* Planet with a satellite riding its orbit */}
      <div className="relative h-24 w-24">
        <div className="bw-breathe absolute inset-0 rounded-full border border-sky-400/40 bg-gradient-to-br from-sky-500/30 via-blue-700/20 to-blue-950/40 shadow-[0_0_40px_-8px_rgba(56,189,248,0.5)]" />
        <div className="bw-orbit absolute -inset-4 rounded-full border border-dashed border-sky-400/25">
          <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-300 shadow-[0_0_10px_2px_rgba(125,211,252,0.7)]" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="text-sm font-medium tracking-wide text-gray-200">Preparing the sky</span>
        <span className="text-xs text-gray-500">This takes a couple of seconds</span>
      </div>

      {/* Step list — done / in progress / pending */}
      <ul className="flex w-60 flex-col gap-2">
        {STEPS.map((step, i) => {
          const state = i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'pending';
          return (
            <li
              key={step.key}
              className={`flex items-center gap-2 text-xs ${
                state === 'pending' ? 'text-gray-600' : state === 'active' ? 'text-gray-200' : 'text-gray-400'
              }`}
            >
              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                {state === 'done' ? (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-emerald-400">
                    <path
                      fillRule="evenodd"
                      d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : state === 'active' ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-700 border-t-sky-400" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-700" />
                )}
              </span>
              {step.label}
            </li>
          );
        })}
      </ul>

      <span
        className={`max-w-xs px-6 text-center text-[11px] leading-relaxed text-gray-500 transition-opacity duration-500 ${
          slow && !done ? 'opacity-100' : 'opacity-0'
        }`}
      >
        First visit downloads high-resolution Earth imagery — the browser caches it, so later visits start instantly.
      </span>
    </div>
  );
}
