import type { TrackPoint } from '@/lib/orbit';

/** Satellite position at the scrubbed moment in time */
export interface ScrubGhost {
  id: number;
  name: string;
  group: string;
  color: string;
  lat: number;
  lng: number;
  alt: number; // normalized to Earth radii
  altKm: number;
  velocity: number;
}

/** Two-sided ground track around the real clock: where it was / where it will be */
export interface ScrubTrack {
  id: number;
  color: string;
  past: TrackPoint[];
  future: TrackPoint[];
}
