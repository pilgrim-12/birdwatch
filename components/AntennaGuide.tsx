'use client';

import { useEffect, useRef } from 'react';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { ANTENNA_TYPES } from '@/lib/radio/antennaGuide';
import type { AntennaType } from '@/lib/radio/antennaGuide';

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Beginner',
  2: 'Intermediate',
  3: 'Advanced',
  4: 'Expert',
};

const DIFFICULTY_COLORS: Record<number, string> = {
  1: 'text-green-400',
  2: 'text-yellow-400',
  3: 'text-orange-400',
  4: 'text-red-400',
};

function DifficultyDots({ level }: { level: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`inline-block w-2 h-2 rounded-full ${
            i <= level ? 'bg-cyan-400' : 'bg-gray-700'
          }`}
        />
      ))}
    </span>
  );
}

function AntennaCard({
  antenna,
  highlighted,
  cardRef,
}: {
  antenna: AntennaType;
  highlighted: boolean;
  cardRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={cardRef}
      className={`rounded-xl border transition-colors ${
        highlighted
          ? 'border-cyan-500/50 bg-cyan-500/5'
          : 'border-gray-800 bg-gray-900/50'
      }`}
    >
      {/* Top: image + info side by side (stacked on mobile) */}
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className="sm:w-52 sm:shrink-0 bg-gray-800 rounded-t-xl sm:rounded-tr-none sm:rounded-l-xl overflow-hidden">
          <img
            src={antenna.imageUrl}
            alt={antenna.imageAlt}
            loading="lazy"
            className="w-full h-40 sm:h-full object-cover"
          />
        </div>

        {/* Info */}
        <div className="flex-1 p-4 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-white">{antenna.name}</h3>
            <span className="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
              {antenna.bands}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <DifficultyDots level={antenna.difficulty} />
              <span className={DIFFICULTY_COLORS[antenna.difficulty]}>
                {DIFFICULTY_LABELS[antenna.difficulty]}
              </span>
            </span>
            <span className="text-gray-400">{antenna.cost}</span>
          </div>

          <p className="text-sm text-gray-300 leading-relaxed">
            {antenna.description}
          </p>
        </div>
      </div>

      {/* Bottom: used for + tips */}
      <div className="border-t border-gray-800 px-4 py-3 space-y-2">
        <div className="flex gap-2">
          <span className="text-[11px] text-gray-500 shrink-0 pt-0.5">Used for:</span>
          <span className="text-[11px] text-gray-300 leading-relaxed">{antenna.usedFor}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-[11px] text-cyan-400/70 shrink-0 pt-0.5">Tips:</span>
          <span className="text-[11px] text-gray-400 leading-relaxed">{antenna.buildTips}</span>
        </div>
      </div>
    </div>
  );
}

export default function AntennaGuide() {
  const isOpen = useSatelliteStore((s) => s.isAntennaGuideOpen);
  const filter = useSatelliteStore((s) => s.antennaGuideFilter);
  const toggleAntennaGuide = useSatelliteStore((s) => s.toggleAntennaGuide);

  const scrollRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggleAntennaGuide();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, toggleAntennaGuide]);

  // Scroll to filtered antenna
  useEffect(() => {
    if (!isOpen || !filter || !highlightRef.current) return;
    const timeout = setTimeout(() => {
      highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    return () => clearTimeout(timeout);
  }, [isOpen, filter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 md:px-6 py-3 border-b border-gray-800">
        <div>
          <h2 className="text-lg font-semibold text-white">Antenna Guide</h2>
          <p className="text-xs text-gray-500 hidden sm:block">
            Antenna types for satellite reception &middot; from beginner to advanced
          </p>
        </div>
        <button
          onClick={toggleAntennaGuide}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors border border-gray-700"
        >
          &times;
        </button>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
        {ANTENNA_TYPES.map((antenna) => {
          const isHighlighted = filter === antenna.id;
          return (
            <AntennaCard
              key={antenna.id}
              antenna={antenna}
              highlighted={isHighlighted}
              cardRef={isHighlighted ? highlightRef : undefined}
            />
          );
        })}

        {/* Attribution footer */}
        <p className="text-[10px] text-gray-600 text-center py-4">
          Images from Wikimedia Commons &middot; Licensed under CC BY-SA
        </p>
      </div>
    </div>
  );
}
