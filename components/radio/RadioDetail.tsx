'use client';

import { useCallback, useMemo } from 'react';
import {
  getRadioProfile,
  getGroupRadioProfile,
  getModeColor,
  getStatusColor,
  getDifficultyLabel,
  getDifficultyColor,
  getUnavailableBandLabel,
} from '@/lib/radio/radioProfiles';
import type { RadioProfile } from '@/lib/radio/radioProfiles';
import { generateSatDumpCommand, downloadConfigJson } from '@/lib/radio/satdumpExport';
import type { ObserverLocation } from '@/types/satellite';
import type { SatellitePass } from '@/lib/passes';

interface RadioDetailProps {
  noradId: number;
  satName: string;
  group?: string;
  observer: ObserverLocation | null;
  pass?: SatellitePass;
}

function formatFrequency(hz: number): string {
  if (hz >= 1_000_000_000) return `${(hz / 1_000_000_000).toFixed(3)} GHz`;
  if (hz >= 1_000_000) return `${(hz / 1_000_000).toFixed(hz % 1_000_000 === 0 ? 0 : 3)} MHz`;
  if (hz >= 1_000) return `${(hz / 1_000).toFixed(0)} kHz`;
  return `${hz} Hz`;
}

function formatBandwidth(hz: number): string {
  if (hz >= 1_000_000) return `${(hz / 1_000_000).toFixed(1)} MHz`;
  if (hz >= 1_000) return `${(hz / 1_000).toFixed(0)} kHz`;
  return `${hz} Hz`;
}

export function RadioDetail({
  noradId,
  satName,
  group,
  observer,
  pass,
}: RadioDetailProps) {
  const profile: RadioProfile | undefined = useMemo(() => {
    const individual = getRadioProfile(noradId);
    if (individual) return individual;
    const groupProf = group ? getGroupRadioProfile(group) : undefined;
    return groupProf ? { ...groupProf, noradId } : undefined;
  }, [noradId, group]);

  const passInfo = useMemo(
    () =>
      pass
        ? { startTime: pass.startTime, endTime: pass.endTime, peakElevation: pass.peakElevation }
        : undefined,
    [pass],
  );

  const handleCopyCommand = useCallback(() => {
    if (!profile) return;
    const cmd = generateSatDumpCommand(profile, satName, passInfo);
    if (cmd) navigator.clipboard.writeText(cmd);
  }, [profile, satName, passInfo]);

  const handleDownloadConfig = useCallback(() => {
    if (!profile) return;
    downloadConfigJson(profile, satName, observer, passInfo);
  }, [profile, satName, observer, passInfo]);

  if (!profile) return null;

  const primaryMode = profile.downlinks[0]?.mode;
  const canReceive = profile.status === 'active' || profile.status === 'intermittent';
  const hasExport = canReceive && profile.satdumpPipeline;

  return (
    <div className="mt-3 pt-3 border-t border-gray-700 space-y-2">
      {/* Header row: Radio + mode + difficulty + status */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-gray-300">Radio</span>
        {primaryMode && (
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium leading-none ${getModeColor(primaryMode)}`}
          >
            {primaryMode.replace('_', ' ')}
          </span>
        )}
        <span className={`text-[10px] font-medium ${getDifficultyColor(profile.difficulty)}`}>
          {getDifficultyLabel(profile.difficulty)}
        </span>
        <span className={`text-[10px] font-medium ml-auto ${getStatusColor(profile.status)}`}>
          {profile.status === 'active' && 'Active'}
          {profile.status === 'inactive' && 'Inactive'}
          {profile.status === 'intermittent' && 'Intermittent'}
          {profile.status === 'unavailable_for_rtlsdr' &&
            `${getUnavailableBandLabel(profile)} only`}
        </span>
      </div>

      {/* Downlinks — compact frequency cards */}
      {profile.downlinks.map((dl, i) => (
        <div key={i} className="flex items-center gap-2 bg-gray-800/50 rounded px-2 py-1.5">
          <span className="text-[11px] font-mono text-cyan-400">{formatFrequency(dl.frequencyHz)}</span>
          <span className="text-[10px] text-gray-500">{dl.mode.replace('_', ' ')}</span>
          <span className="text-[10px] text-gray-600 ml-auto">BW {formatBandwidth(dl.bandwidthHz)}</span>
        </div>
      ))}

      {/* Antenna */}
      <div className="flex items-start gap-1.5">
        <span className="text-[10px] text-gray-500 shrink-0">Antenna:</span>
        <span className="text-[11px] text-gray-300">{profile.antenna}</span>
      </div>

      {/* What you receive */}
      <div className={`text-[11px] leading-relaxed ${canReceive ? 'text-gray-300' : 'text-gray-500'}`}>
        {profile.whatYouReceive}
      </div>

      {/* How to receive — highlighted card for active satellites */}
      {canReceive && (
        <div className="bg-cyan-500/5 border border-cyan-500/10 rounded px-2.5 py-2">
          <div className="text-[10px] text-cyan-400/70 font-medium mb-1">How to receive</div>
          <div className="text-[11px] text-gray-300 leading-relaxed">{profile.howToReceive}</div>
        </div>
      )}

      {/* SatDump pipeline info */}
      {profile.satdumpPipeline && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500">SatDump:</span>
          <code className="text-[10px] text-cyan-400 bg-gray-800 px-1.5 py-0.5 rounded font-mono">
            {profile.satdumpPipeline}
          </code>
          {profile.samplerateHz && (
            <span className="text-[10px] text-gray-500">@ {(profile.samplerateHz / 1_000_000).toFixed(1)} MSPS</span>
          )}
        </div>
      )}

      {/* Notes */}
      {profile.notes && (
        <div className="text-[10px] text-gray-500 italic leading-relaxed">{profile.notes}</div>
      )}

      {/* Export buttons */}
      {hasExport && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleCopyCommand}
            className="px-2.5 py-1.5 rounded text-[10px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 active:bg-cyan-500/30 transition-colors"
          >
            Copy SatDump CLI
          </button>
          <button
            onClick={handleDownloadConfig}
            className="px-2.5 py-1.5 rounded text-[10px] font-medium bg-gray-700/50 text-gray-300 border border-gray-600/30 hover:bg-gray-700 active:bg-gray-600 transition-colors"
          >
            Download config
          </button>
        </div>
      )}
    </div>
  );
}
