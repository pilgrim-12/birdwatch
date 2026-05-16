import {
  twoline2satrec,
  propagate,
  gstime,
  eciToEcf,
  ecfToLookAngles,
  degreesToRadians,
} from 'satellite.js';

interface TLEData {
  line1: string;
  line2: string;
}

interface SatellitePass {
  satId: number;
  satName: string;
  startTime: number; // timestamp (not Date, for structured clone)
  peakTime: number;
  endTime: number;
  peakElevation: number;
}

interface WorkerInput {
  satellites: { id: number; name: string; tle: TLEData }[];
  observer: { lat: number; lng: number; alt: number };
  hoursAhead: number;
}

function getElevation(
  satrec: ReturnType<typeof twoline2satrec>,
  observerGd: { longitude: number; latitude: number; height: number },
  date: Date,
): number | null {
  const posVel = propagate(satrec, date);
  if (typeof posVel.position === 'boolean') return null;

  const gmst = gstime(date);
  const ecf = eciToEcf(posVel.position, gmst);
  const angles = ecfToLookAngles(observerGd, ecf);

  return Number(angles.elevation) * (180 / Math.PI);
}

function findPasses(data: WorkerInput): SatellitePass[] {
  const { satellites, observer, hoursAhead } = data;
  const passes: SatellitePass[] = [];
  const stepMs = 60_000; // 60 seconds (was 30s — doubled for performance)
  const now = Date.now();
  const endMs = now + hoursAhead * 3_600_000;

  const observerGd = {
    longitude: degreesToRadians(observer.lng),
    latitude: degreesToRadians(observer.lat),
    height: observer.alt / 1000,
  };

  for (const sat of satellites) {
    let satrec: ReturnType<typeof twoline2satrec>;
    try {
      satrec = twoline2satrec(sat.tle.line1, sat.tle.line2);
    } catch {
      continue;
    }

    let inPass = false;
    let passStart = 0;
    let peakEl = 0;
    let peakTime = 0;

    for (let t = now; t <= endMs; t += stepMs) {
      const date = new Date(t);
      const el = getElevation(satrec, observerGd, date);
      if (el === null) continue;

      if (el > 0) {
        if (!inPass) {
          inPass = true;
          passStart = t;
          peakEl = el;
          peakTime = t;
        }
        if (el > peakEl) {
          peakEl = el;
          peakTime = t;
        }
      } else if (inPass) {
        inPass = false;
        if (peakEl >= 5) {
          passes.push({
            satId: sat.id,
            satName: sat.name,
            startTime: passStart,
            peakTime,
            endTime: t,
            peakElevation: peakEl,
          });
        }
      }
    }

    if (inPass && peakEl >= 5) {
      passes.push({
        satId: sat.id,
        satName: sat.name,
        startTime: passStart,
        peakTime,
        endTime: endMs,
        peakElevation: peakEl,
      });
    }
  }

  passes.sort((a, b) => a.startTime - b.startTime);
  return passes;
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const result = findPasses(e.data);
  self.postMessage(result);
};
