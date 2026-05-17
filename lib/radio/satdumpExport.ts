import type { RadioProfile } from './radioProfiles';
import type { ObserverLocation } from '@/types/satellite';

interface PassInfo {
  startTime: Date;
  endTime: Date;
  peakElevation: number;
}

/**
 * Generate a SatDump CLI command string for a satellite pass.
 */
export function generateSatDumpCommand(
  profile: RadioProfile,
  satName: string,
  pass?: PassInfo,
): string {
  const pipeline = profile.satdumpPipeline;
  if (!pipeline || profile.downlinks.length === 0) return '';

  const dl = profile.downlinks[0];
  const sr = profile.samplerateHz ?? 2_400_000;
  const durationS = pass
    ? Math.round((pass.endTime.getTime() - pass.startTime.getTime()) / 1000)
    : 900;

  const timestamp = pass
    ? formatTimestamp(pass.startTime)
    : formatTimestamp(new Date());

  const safeName = satName.replace(/[^a-zA-Z0-9_-]/g, '_');

  return [
    'SatDump.exe live',
    pipeline,
    `"output_${safeName}_${timestamp}"`,
    '--source rtlsdr',
    `--frequency ${dl.frequencyHz}`,
    `--samplerate ${sr}`,
    '--general_gain 40',
    `--timeout ${durationS}`,
  ].join(' ');
}

/**
 * Generate a JSON config object for a satellite pass.
 */
export function generateSatDumpConfig(
  profile: RadioProfile,
  satName: string,
  observer: ObserverLocation | null,
  pass?: PassInfo,
): object {
  const dl = profile.downlinks[0];
  const sr = profile.samplerateHz ?? 2_400_000;
  const durationS = pass
    ? Math.round((pass.endTime.getTime() - pass.startTime.getTime()) / 1000)
    : 900;

  return {
    satellite: satName,
    norad_id: profile.noradId,
    pipeline: profile.satdumpPipeline ?? null,
    frequency_hz: dl?.frequencyHz ?? null,
    samplerate_hz: sr,
    gain: 40,
    mode: dl?.mode ?? null,
    antenna: profile.antenna,
    pass: pass
      ? {
          aos: pass.startTime.toISOString(),
          los: pass.endTime.toISOString(),
          max_elevation_deg: Math.round(pass.peakElevation),
          duration_s: durationS,
        }
      : null,
    observer: observer
      ? {
          lat: observer.lat,
          lon: observer.lng,
          alt_m: observer.alt,
        }
      : null,
    generated_by: 'BirdWatch',
    generated_at: new Date().toISOString(),
    // TODO: Add SatDump pipeline.json generation for automatic import
  };
}

/**
 * Trigger a JSON config file download in the browser.
 */
export function downloadConfigJson(
  profile: RadioProfile,
  satName: string,
  observer: ObserverLocation | null,
  pass?: PassInfo,
): void {
  const config = generateSatDumpConfig(profile, satName, observer, pass);
  const json = JSON.stringify(config, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const safeName = satName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const timestamp = pass
    ? formatTimestamp(pass.startTime)
    : formatTimestamp(new Date());

  const a = document.createElement('a');
  a.href = url;
  a.download = `birdwatch_${safeName}_${timestamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatTimestamp(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}${m}${d}_${h}${min}`;
}
