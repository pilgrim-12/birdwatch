'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useSatelliteStore } from '@/store/useSatelliteStore';
import { useShallow } from 'zustand/react/shallow';
import { GROUP_COLORS, GROUP_LABELS } from '@/lib/constants';
import type { SatelliteGroup } from '@/lib/constants';

export default function HeaderSearch() {
  const {
    searchQuery, collectionSatIds, activeGroups,
  } = useSatelliteStore(useShallow((s) => ({
    searchQuery: s.searchQuery,
    collectionSatIds: s.collectionSatIds,
    activeGroups: s.activeGroups,
  })));

  const {
    setSearchQuery, selectSatellite, toggleGroup,
    setSatellites, addToCollection, removeFromCollection,
  } = useSatelliteStore(useShallow((s) => ({
    setSearchQuery: s.setSearchQuery,
    selectSatellite: s.selectSatellite,
    toggleGroup: s.toggleGroup,
    setSatellites: s.setSatellites,
    addToCollection: s.addToCollection,
    removeFromCollection: s.removeFromCollection,
  })));

  const satellites = useSatelliteStore((s) => s.satellites);
  const massSatellites = useSatelliteStore((s) => s.massSatellites);

  // Search state
  const [searchFocused, setSearchFocused] = useState(false);
  const [remoteResults, setRemoteResults] = useState<Array<{ id: number; name: string; group: string }>>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Local results: search among loaded satellites
  const localResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const all = [...satellites, ...massSatellites];
    return all.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 20);
  }, [searchQuery, satellites, massSatellites]);

  // Remote search: query CelesTrak API with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = searchQuery.trim();
    if (q.length < 2) {
      setRemoteResults([]);
      setRemoteLoading(false);
      return;
    }
    // Skip remote search if local results are sufficient
    if (localResults.length >= 5) {
      setRemoteResults([]);
      return;
    }
    setRemoteLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          // Filter out satellites already in local results
          const localIds = new Set(localResults.map((s) => s.id));
          const filtered = data
            .filter((r: { id: number }) => !localIds.has(r.id))
            .map((r: { id: number; name: string }) => ({ ...r, group: 'celestrak' }));
          setRemoteResults(filtered);
        }
      } catch { /* ignore */ }
      setRemoteLoading(false);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, localResults]);

  // Combined results: local first, then remote
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return [
      ...localResults.map((s) => ({ id: s.id, name: s.name, group: s.group, remote: false })),
      ...remoteResults.map((s) => ({ id: s.id, name: s.name, group: s.group, remote: true })),
    ].slice(0, 25);
  }, [searchQuery, localResults, remoteResults]);

  const handleSearchSelect = useCallback(async (satId: number, group: string, remote: boolean) => {
    if (remote) {
      // Remote satellite — fetch its TLE and add to loaded satellites
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          const match = data.find((r: { id: number }) => r.id === satId);
          if (match) {
            const newSat = { id: match.id, name: match.name, tle: match.tle, group: 'search', position: null };
            setSatellites([...satellites, newSat]);
          }
        }
      } catch { /* ignore */ }
    } else if (!activeGroups.includes(group as SatelliteGroup)) {
      toggleGroup(group as SatelliteGroup);
    }
    selectSatellite(satId);
    setSearchQuery('');
    setSearchFocused(false);
    searchInputRef.current?.blur();
  }, [selectSatellite, activeGroups, toggleGroup, setSearchQuery, searchQuery, satellites, setSatellites]);

  // Close search dropdown on outside click
  useEffect(() => {
    if (!searchFocused) return;
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [searchFocused]);

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
        </svg>
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setSearchQuery('');
              setSearchFocused(false);
              searchInputRef.current?.blur();
            }
          }}
          placeholder="Search satellite..."
          className="w-40 pl-7 pr-6 py-1 rounded text-[11px] bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
        />
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
              <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
            </svg>
          </button>
        )}
      </div>
      {searchFocused && (searchResults.length > 0 || remoteLoading) && (
        <div className="absolute left-0 top-full mt-1 w-72 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 max-h-[300px] overflow-y-auto">
          {searchResults.map((sat) => {
            const color = sat.remote ? '#888' : (sat.group === 'collection' ? '#ffd700' : (GROUP_COLORS[sat.group as SatelliteGroup] || '#00d4ff'));
            const inCollection = collectionSatIds.includes(sat.id);
            return (
              <div
                key={`${sat.id}-${sat.remote ? 'r' : 'l'}`}
                className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-800 flex items-center gap-2 transition-colors"
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSearchSelect(sat.id, sat.group, sat.remote)}
                  className="text-gray-200 truncate flex-1 text-left"
                >
                  {sat.name}
                </button>
                {sat.remote ? (
                  <span className="text-[10px] text-yellow-500 shrink-0">CelesTrak</span>
                ) : (
                  <span className="text-gray-500 text-[10px] shrink-0">{sat.group === 'collection' ? 'Collection' : (GROUP_LABELS[sat.group as SatelliteGroup] || sat.group)}</span>
                )}
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (inCollection) {
                      removeFromCollection(sat.id);
                    } else {
                      // Need full satellite data for collection
                      if (sat.remote) {
                        try {
                          const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
                          if (res.ok) {
                            const data = await res.json();
                            const match = data.find((r: { id: number }) => r.id === sat.id);
                            if (match) {
                              const newSat = { id: match.id, name: match.name, tle: match.tle, group: 'collection', position: null };
                              addToCollection(newSat);
                              setSatellites([...satellites, newSat]);
                            }
                          }
                        } catch { /* ignore */ }
                      } else {
                        const found = [...satellites, ...massSatellites].find((s) => s.id === sat.id);
                        if (found) addToCollection(found);
                      }
                    }
                  }}
                  className={`shrink-0 text-sm leading-none transition-colors ${
                    inCollection ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-600 hover:text-yellow-400'
                  }`}
                  title={inCollection ? 'Remove from collection' : 'Add to collection'}
                >
                  {inCollection ? '\u2605' : '\u2606'}
                </button>
              </div>
            );
          })}
          {remoteLoading && searchResults.length === 0 && (
            <div className="px-3 py-2 text-[11px] text-gray-500">Searching CelesTrak...</div>
          )}
        </div>
      )}
    </div>
  );
}
