'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { useToastStore } from '@/store/useToastStore';

interface GeocodeResult {
  id: number;
  name: string;
  region: string;
  countryCode: string | null;
  lat: number;
  lng: number;
  alt: number;
}

interface ObserverPanelProps {
  /** Called after the observer location changes, e.g. to close a dropdown */
  onApplied?: () => void;
}

/**
 * Everything needed to set the observer location: device geolocation,
 * city search, manual coordinates and saved places. Shared by the desktop
 * header dropdown and the mobile menu.
 */
export default function ObserverPanel({ onApplied }: ObserverPanelProps) {
  const observer = useSatelliteStore((s) => s.observer);
  const observerLabel = useSatelliteStore((s) => s.observerLabel);
  const setObserver = useSatelliteStore((s) => s.setObserver);
  const savedPlaces = useSatelliteStore((s) => s.savedPlaces);
  const addSavedPlace = useSatelliteStore((s) => s.addSavedPlace);
  const removeSavedPlace = useSatelliteStore((s) => s.removeSavedPlace);
  const addToast = useToastStore((s) => s.addToast);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [altInput, setAltInput] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the manual fields in sync with the active observer
  useEffect(() => {
    setLatInput(observer ? observer.lat.toFixed(4) : '');
    setLngInput(observer ? observer.lng.toFixed(4) : '');
    setAltInput(observer ? String(Math.round(observer.alt)) : '');
  }, [observer]);

  // Debounced city search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        setResults(res.ok ? await res.json() : []);
      } catch {
        setResults([]);
      }
      setSearching(false);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const useMyLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      addToast('Geolocation is not available in this browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setObserver(
          {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            alt: Math.max(0, Math.round(pos.coords.altitude ?? 0)),
          },
          'My location',
        );
        onApplied?.();
      },
      (err) => {
        setLocating(false);
        addToast(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied — pick a city or click the map instead'
            : 'Could not get your location',
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
    );
  }, [setObserver, addToast, onApplied]);

  const applyManual = useCallback(() => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    const alt = altInput.trim() === '' ? 0 : parseFloat(altInput);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      addToast('Enter a valid latitude (-90..90) and longitude (-180..180)');
      return;
    }
    setObserver({ lat, lng, alt: Number.isFinite(alt) ? alt : 0 });
    onApplied?.();
  }, [latInput, lngInput, altInput, setObserver, addToast, onApplied]);

  const pickPlace = useCallback(
    (place: GeocodeResult) => {
      setObserver({ lat: place.lat, lng: place.lng, alt: place.alt }, place.name);
      setQuery('');
      setResults([]);
      onApplied?.();
    },
    [setObserver, onApplied],
  );

  const inputClass =
    'w-full px-2 py-1 rounded text-[11px] bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50';

  return (
    <div className="space-y-2.5">
      {/* Current location */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Observer</span>
        {observer ? (
          <span className="text-[11px] text-orange-400 font-mono truncate">
            {observerLabel ? `${observerLabel} · ` : ''}
            {observer.lat.toFixed(3)}&deg;, {observer.lng.toFixed(3)}&deg;
            {observer.alt > 0 ? ` · ${Math.round(observer.alt)} m` : ''}
          </span>
        ) : (
          <span className="text-[11px] text-gray-500">not set</span>
        )}
        {observer && (
          <button
            onClick={() => setObserver(null)}
            className="ml-auto text-[10px] text-gray-500 hover:text-red-400 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Device geolocation */}
      <button
        onClick={useMyLocation}
        disabled={locating}
        className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 transition-colors disabled:opacity-50"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
          <path fillRule="evenodd" d="M9.69 18.933l.003.001A.752.752 0 0 0 10 19a.75.75 0 0 0 .307-.067l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .31-.15 22.916 22.916 0 0 0 3.434-2.414C15.818 14.867 17.5 12.5 17.5 9.5a7.5 7.5 0 1 0-15 0c0 3 1.682 5.367 3.423 6.857a22.916 22.916 0 0 0 3.744 2.564l.018.008.006.003ZM10 11.75a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
        </svg>
        {locating ? 'Locating…' : 'Use my location'}
      </button>

      {/* City search */}
      <div className="space-y-1">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search city or place…"
          className={inputClass}
        />
        {searching && results.length === 0 && query.trim().length >= 2 && (
          <p className="text-[10px] text-gray-500 px-1">Searching…</p>
        )}
        {results.length > 0 && (
          <div className="max-h-40 overflow-y-auto rounded border border-gray-700 divide-y divide-gray-800">
            {results.map((place) => (
              <button
                key={place.id}
                onClick={() => pickPlace(place)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-left hover:bg-gray-800 transition-colors"
              >
                {place.countryCode && (
                  <span
                    className={`fi fi-${place.countryCode}`}
                    style={{ width: 14, height: 10, display: 'inline-block', backgroundSize: 'cover', flexShrink: 0 }}
                  />
                )}
                <span className="text-[11px] text-gray-200 truncate">{place.name}</span>
                <span className="text-[10px] text-gray-500 truncate">{place.region}</span>
                <span className="ml-auto text-[10px] text-gray-600 font-mono shrink-0">
                  {place.lat.toFixed(1)}, {place.lng.toFixed(1)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Manual coordinates */}
      <div className="flex items-end gap-1.5">
        <label className="flex-1 min-w-0">
          <span className="block text-[9px] text-gray-500 mb-0.5">Lat</span>
          <input value={latInput} onChange={(e) => setLatInput(e.target.value)} inputMode="decimal" className={inputClass} />
        </label>
        <label className="flex-1 min-w-0">
          <span className="block text-[9px] text-gray-500 mb-0.5">Lng</span>
          <input value={lngInput} onChange={(e) => setLngInput(e.target.value)} inputMode="decimal" className={inputClass} />
        </label>
        <label className="w-16 shrink-0">
          <span className="block text-[9px] text-gray-500 mb-0.5">Alt m</span>
          <input value={altInput} onChange={(e) => setAltInput(e.target.value)} inputMode="numeric" className={inputClass} />
        </label>
        <button
          onClick={applyManual}
          className="px-2 py-1 rounded text-[11px] bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
        >
          Set
        </button>
      </div>

      {/* Saved places */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Saved places</span>
          {observer && (
            <button
              onClick={() =>
                addSavedPlace({
                  name: observerLabel || `${observer.lat.toFixed(2)}, ${observer.lng.toFixed(2)}`,
                  lat: observer.lat,
                  lng: observer.lng,
                  alt: observer.alt,
                })
              }
              className="text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              + Save current
            </button>
          )}
        </div>
        {savedPlaces.length === 0 ? (
          <p className="text-[10px] text-gray-600">
            Nothing saved yet — set a location and save it for one-click switching.
          </p>
        ) : (
          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {savedPlaces.map((place) => (
              <div
                key={place.id}
                className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-gray-800 transition-colors group"
              >
                <button
                  onClick={() => {
                    setObserver({ lat: place.lat, lng: place.lng, alt: place.alt }, place.name);
                    onApplied?.();
                  }}
                  className="flex-1 min-w-0 text-left flex items-center gap-1.5"
                >
                  <span className="text-[11px] text-gray-200 truncate">{place.name}</span>
                  <span className="text-[10px] text-gray-600 font-mono shrink-0">
                    {place.lat.toFixed(1)}, {place.lng.toFixed(1)}
                  </span>
                </button>
                <button
                  onClick={() => removeSavedPlace(place.id)}
                  className="text-gray-600 hover:text-red-400 text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[10px] text-gray-600">
        You can also click anywhere on the globe or map to drop the observer there.
      </p>
    </div>
  );
}
