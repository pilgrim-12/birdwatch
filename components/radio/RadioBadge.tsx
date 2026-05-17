import {
  getRadioProfile,
  getGroupRadioProfile,
  getModeColor,
  getUnavailableBandLabel,
} from '@/lib/radio/radioProfiles';
import type { RadioStatus } from '@/lib/radio/radioProfiles';

interface RadioBadgeProps {
  noradId: number;
  group?: string;
}

export function RadioBadge({ noradId, group }: RadioBadgeProps) {
  const profile = getRadioProfile(noradId);
  const groupProfile = group ? getGroupRadioProfile(group) : undefined;
  const effective = profile ?? (groupProfile ? { ...groupProfile, noradId } : undefined);

  if (!effective) return null;

  const primaryMode = effective.downlinks[0]?.mode;
  if (!primaryMode) return null;

  return (
    <span className="inline-flex items-center gap-1 shrink-0">
      {/* Mode badge */}
      <span
        className={`px-1.5 py-0.5 rounded text-[10px] font-medium leading-none ${getModeColor(primaryMode)}`}
      >
        {primaryMode.replace('_', ' ')}
      </span>

      {/* Status indicators */}
      <StatusIndicator status={effective.status} profile={effective} />
    </span>
  );
}

function StatusIndicator({
  status,
  profile,
}: {
  status: RadioStatus;
  profile: { downlinks: { frequencyHz: number }[]; noradId: number; status: RadioStatus; difficulty: string; antenna: string; whatYouReceive: string; howToReceive: string };
}) {
  if (status === 'inactive') {
    return (
      <span className="px-1 py-0.5 rounded text-[10px] font-medium leading-none bg-red-500/20 text-red-400 border border-red-500/30">
        DEAD
      </span>
    );
  }

  if (status === 'unavailable_for_rtlsdr') {
    const band = getUnavailableBandLabel(profile as Parameters<typeof getUnavailableBandLabel>[0]);
    return (
      <span
        className="px-1 py-0.5 rounded text-[10px] font-medium leading-none bg-gray-600/20 text-gray-500 border border-gray-600/30"
        title="Not receivable on RTL-SDR"
      >
        {band}
      </span>
    );
  }

  if (status === 'intermittent') {
    return (
      <span
        className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0"
        title="Intermittent — not always active"
      />
    );
  }

  return null;
}
