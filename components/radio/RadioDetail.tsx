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
    <div className="mt-3 pt-3 border-t border-gray-700">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-gray-300">Radio</span>
        {primaryMode && (
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium leading-none ${getModeColor(primaryMode)}`}
          >
            {primaryMode.replace('_', ' ')}
          </span>
        )}
        <span className={`text-[10px] ${getDifficultyColor(profile.difficulty)}`}>
          {getDifficultyLabel(profile.difficulty)}
        </span>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] text-gray-500">Status:</span>
        <span className={`text-[10px] font-medium ${getStatusColor(profile.status)}`}>
          {profile.status === 'active' && 'Active'}
          {profile.status === 'inactive' && 'Inactive (decommissioned)'}
          {profile.status === 'intermittent' && 'Intermittent'}
          {profile.status === 'unavailable_for_rtlsdr' &&
            `${getUnavailableBandLabel(profile)} — not for RTL-SDR`}
        </span>
      </div>

      {/* Antenna */}
      <div className="text-[10px] text-gray-500 mb-2">
        Antenna: <span className="text-gray-400">{profile.antenna}</span>
      </div>

      {/* What you receive */}
      <div className={`text-[11px] mb-2 ${canReceive ? 'text-gray-300' : 'text-gray-500'}`}>
        <div className="text-[10px] text-gray-500 mb-0.5">
          {canReceive ? 'What you receive:' : 'Info:'}
        </div>
        {profile.whatYouReceive}
      </div>

      {/* How to receive */}
      {canReceive && (
        <div className="text-[11px] text-gray-400 mb-2">
          <div className="text-[10px] text-gray-500 mb-0.5">How to receive:</div>
          {profile.howToReceive}
        </div>
      )}

      {/* Downlinks list */}
      {profile.downlinks.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] text-gray-500 mb-1">Downlinks:</div>
          {profile.downlinks.map((dl, i) => (
            <div key={i} className="text-[10px] text-gray-400 pl-2">
              &bull; {formatFrequency(dl.frequencyHz)} &mdash;{' '}
              {dl.mode.replace('_', ' ')}
              {dl.description && ` (${dl.description})`}
              <span className="text-gray-600 ml-1">BW {formatBandwidth(dl.bandwidthHz)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      {profile.notes && (
        <div className="text-[10px] text-gray-600 italic mb-2">{profile.notes}</div>
      )}

      {/* Export buttons */}
      {hasExport && (
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleCopyCommand}
            className="px-2 py-1 rounded text-[10px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"
          >
            Copy SatDump CLI
          </button>
          <button
            onClick={handleDownloadConfig}
            className="px-2 py-1 rounded text-[10px] font-medium bg-gray-700/50 text-gray-300 border border-gray-600/30 hover:bg-gray-700 transition-colors"
          >
            Download config.json
          </button>
        </div>
      )}
    </div>
  );
}
