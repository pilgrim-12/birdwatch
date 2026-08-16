'use client';

import { useEffect } from 'react';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import ObserverPanel from '@/components/ObserverPanel';

/** Modal wrapper around ObserverPanel — openable from the header, mobile menu and sidebar. */
export default function ObserverPicker() {
  const isOpen = useSatelliteStore((s) => s.isObserverPickerOpen);
  const setOpen = useSatelliteStore((s) => s.setObserverPickerOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, setOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-24 px-4 bg-black/60"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Your location</h2>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
          >
            &times;
          </button>
        </div>
        <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
          Passes, elevation/azimuth, Doppler and visible-tonight predictions are all computed
          from this point.
        </p>
        <ObserverPanel onApplied={() => setOpen(false)} />
      </div>
    </div>
  );
}
