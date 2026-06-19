'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Visitor } from '@/types/analytics';

interface AdminMapProps {
  visitors: Visitor[];
}

export default function AdminMap({ visitors }: AdminMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [30, 20],
      zoom: 2,
      minZoom: 2,
      maxBounds: [[-85, -180], [85, 180]],
      maxBoundsViscosity: 1.0,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      subdomains: 'abcd',
      noWrap: true,
      bounds: [[-85, -180], [85, 180]],
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Fix Leaflet resize issue inside hidden/resized containers
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  // Update visitor markers
  useEffect(() => {
    const markers = markersRef.current;
    if (!markers) return;

    markers.clearLayers();

    const visitorsWithCoords = visitors.filter((v) => v.lat != null && v.lng != null);

    // Bucket by approximate location
    const buckets = new Map<string, { lat: number; lng: number; count: number; cities: string[] }>();
    for (const v of visitorsWithCoords) {
      const key = `${Math.round(v.lat! * 2) / 2},${Math.round(v.lng! * 2) / 2}`;
      const existing = buckets.get(key);
      if (existing) {
        existing.count++;
        if (v.city && !existing.cities.includes(v.city)) existing.cities.push(v.city);
      } else {
        buckets.set(key, {
          lat: v.lat!,
          lng: v.lng!,
          count: 1,
          cities: v.city ? [v.city] : [],
        });
      }
    }

    const bounds: L.LatLngExpression[] = [];

    for (const { lat, lng, count, cities } of buckets.values()) {
      const radius = Math.min(6 + count * 2, 25);
      const label = cities.length > 0
        ? `<b>${cities.join(', ')}</b><br/>${count} visitor${count > 1 ? 's' : ''}`
        : `${count} visitor${count > 1 ? 's' : ''}`;

      L.circleMarker([lat, lng], {
        radius,
        fillColor: '#00d4ff',
        color: '#00a0cc',
        fillOpacity: 0.7,
        weight: 1.5,
      })
        .bindPopup(label)
        .addTo(markers);

      bounds.push([lat, lng]);
    }

    // Fit map to visitor locations
    if (bounds.length > 0 && mapRef.current) {
      mapRef.current.fitBounds(L.latLngBounds(bounds as L.LatLngTuple[]).pad(0.3), {
        maxZoom: 8,
      });
    }
  }, [visitors]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: '300px', background: '#0d1117' }}
    />
  );
}
