import { propagateSatellite } from './sgp4';
import type { TLEData, SatellitePosition } from '@/types/satellite';

const MAX_MS_PER_CHUNK = 8; // yield after 8ms to keep ~60fps

/**
 * Propagate a large set of satellites in time-sliced chunks using requestAnimationFrame.
 * Yields to the main thread after MAX_MS_PER_CHUNK to avoid blocking UI.
 * Returns a cancel function.
 */
export function propagateChunked(
  satellites: { tle: TLEData; id: number }[],
  date: Date,
  onComplete: (positions: Map<number, SatellitePosition>) => void,
): () => void {
  const positions = new Map<number, SatellitePosition>();
  let index = 0;
  let cancelled = false;
  let rafId: number | null = null;

  function processChunk() {
    if (cancelled) return;
    const start = performance.now();

    while (index < satellites.length) {
      const sat = satellites[index];
      const pos = propagateSatellite(sat.tle, date);
      if (pos) positions.set(sat.id, pos);
      index++;

      if (performance.now() - start > MAX_MS_PER_CHUNK) {
        rafId = requestAnimationFrame(processChunk);
        return;
      }
    }

    // All done
    if (!cancelled) {
      onComplete(positions);
    }
  }

  rafId = requestAnimationFrame(processChunk);

  return () => {
    cancelled = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
  };
}
