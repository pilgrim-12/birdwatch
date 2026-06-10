import type { SatellitePass } from '@/lib/passes';
import { RadioBadge } from '@/components/radio/RadioBadge';

interface RadioProfile {
  antenna: string;
  status?: string;
  downlinks: { frequencyHz: number }[];
}

interface PassListItemProps {
  pass: SatellitePass;
  index: number;
  isBest: boolean;
  doppler: number | undefined;
  profile: RadioProfile | null | undefined;
  isSelected: boolean;
  now: Date;
  observer: { lat: number; lng: number; alt: number } | null;
  tleData: { name: string; line1: string; line2: string } | undefined;
  detailSatId: number | null;
  setDetailSatId: (id: number | null) => void;
  selectSatellite: (id: number) => void;
  formatTime: (d: Date) => string;
  formatDuration: (s: Date, e: Date) => string;
  formatCountdown: (now: Date, pass: { startTime: Date; endTime: Date }) => { text: string; isLive: boolean; urgency: 'past' | 'live' | 'soon' | 'normal' };
  formatLiveLabel: (now: Date, pass: SatellitePass, timeText: string, tle: { name: string; line1: string; line2: string } | undefined, observer: { lat: number; lng: number; alt: number } | null) => string;
  compact?: boolean;
}

export function PassListItem({
  pass, index, isBest, doppler, profile, isSelected, now,
  observer, tleData, detailSatId, setDetailSatId, selectSatellite,
  formatTime, formatDuration, formatCountdown, formatLiveLabel,
  compact = false,
}: PassListItemProps) {
  const inactive = profile?.status === 'inactive';
  const isWeak = pass.peakElevation < 10;

  const cd = formatCountdown(now, pass);

  return (
    <li
      key={`${pass.satId}-${index}`}
      className={`text-xs rounded px-2 ${compact ? 'py-1.5' : 'py-2'} cursor-pointer transition-colors ${
        isSelected
          ? 'bg-cyan-500/15 ring-1 ring-cyan-400/40'
          : isBest
            ? 'bg-amber-500/10 ring-1 ring-amber-400/40 hover:bg-amber-500/15'
            : isWeak
              ? 'bg-gray-800/30 opacity-50 hover:opacity-80 hover:bg-gray-800/50'
              : 'bg-gray-800/50 hover:bg-gray-800'
      }`}
      onClick={() => selectSatellite(pass.satId)}
    >
      <div className="flex justify-between items-center gap-1">
        <div className="flex items-center gap-1 min-w-0">
          {isBest && (
            <span className="shrink-0" title="Best pass">
              &#11088;
            </span>
          )}
          <span className={`font-medium truncate ${inactive ? 'text-gray-500 opacity-60' : 'text-gray-200'}`}>
            {pass.satName}
          </span>
          <RadioBadge noradId={pass.satId} />
        </div>
        <span className={`font-mono shrink-0 ${
          pass.peakElevation >= 45 ? 'text-green-400' :
          pass.peakElevation >= 20 ? 'text-green-400/70' :
          pass.peakElevation >= 10 ? 'text-yellow-400/70' :
          'text-gray-500'
        }`}>
          {pass.peakElevation.toFixed(0)}&deg;
        </span>
      </div>

      <div className={`text-gray-500 mt-0.5 flex items-center ${compact ? 'gap-1 flex-wrap' : 'justify-between'}`}>
        {compact ? (
          <>
            <span className="shrink-0">
              {formatTime(pass.startTime)}&ndash;{formatTime(pass.endTime)}
            </span>
            <span className="shrink-0">
              ({formatDuration(pass.startTime, pass.endTime)})
            </span>
            {doppler !== undefined && doppler > 0 && (
              <span className="text-gray-600 font-mono shrink-0" title="Max Doppler shift">
                &plusmn;{(doppler / 1000).toFixed(1)}kHz
              </span>
            )}
          </>
        ) : (
          <>
            <span>
              {formatTime(pass.startTime)} &ndash; {formatTime(pass.endTime)}
              <span className="ml-2">
                ({formatDuration(pass.startTime, pass.endTime)})
              </span>
            </span>
            {doppler !== undefined && doppler > 0 && (
              <span className="text-gray-600 font-mono" title="Max Doppler shift">
                &plusmn;{(doppler / 1000).toFixed(1)} kHz
              </span>
            )}
          </>
        )}
      </div>

      {cd.urgency !== 'past' && (() => {
        const styles = {
          live: 'bg-green-500/20 text-green-400 border border-green-500/30 shadow-[0_0_6px_rgba(34,197,94,0.25)]',
          soon: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
          normal: 'bg-cyan-500/10 text-cyan-400/80 border border-cyan-500/20',
          past: 'text-gray-600',
        };
        return (
          <span className={`inline-block text-[10px] font-mono mt-0.5 px-1.5 py-0.5 rounded-full ${styles[cd.urgency]}`}>
            {cd.isLive ? formatLiveLabel(now, pass, cd.text, tleData, observer) : cd.text}
          </span>
        );
      })()}

      {isBest && (
        <div className="text-[10px] text-amber-400/70 mt-0.5">Best pass</div>
      )}

      {profile && !inactive && (
        <div className="mt-1.5 pt-1.5 border-t border-gray-700/50 space-y-0.5">
          {profile.downlinks.length > 0 && (
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="text-gray-500">Freq:</span>
              <span className="text-green-400 font-mono">
                {profile.downlinks.map((d) =>
                  d.frequencyHz >= 1e9
                    ? `${(d.frequencyHz / 1e9).toFixed(3)} GHz`
                    : `${(d.frequencyHz / 1e6).toFixed(3)} MHz`
                ).join(', ')}
              </span>
            </div>
          )}
          <div className={`flex items-start gap-1.5 text-[10px] ${compact ? 'min-w-0' : ''}`}>
            <span className="text-gray-500 shrink-0">Ant:</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDetailSatId(detailSatId === pass.satId ? null : pass.satId);
              }}
              className={`text-cyan-400 hover:text-cyan-300 underline underline-offset-2 decoration-cyan-400/30 text-left ${compact ? 'truncate' : ''}`}
            >
              {profile.antenna}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
