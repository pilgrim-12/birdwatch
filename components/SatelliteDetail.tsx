'use client';

import type { SatellitePosition } from '@/types/satellite';
import type { SatNogsInfo, SatNogsTransmitter } from '@/types/satnogs';
import type { SatellitePass } from '@/lib/passes';
import { RadioBadge } from '@/components/radio/RadioBadge';
import { RadioDetail } from '@/components/radio/RadioDetail';

function formatFreqHz(hz: number): string {
  if (hz >= 1e9) return `${(hz / 1e9).toFixed(3)} GHz`;
  if (hz >= 1e6) return `${(hz / 1e6).toFixed(3)} MHz`;
  if (hz >= 1e3) return `${(hz / 1e3).toFixed(1)} kHz`;
  return `${hz} Hz`;
}

interface SatelliteDetailProps {
  sat: { id: number; name: string; group: string };
  position: SatellitePosition | undefined;
  satnogsInfo: SatNogsInfo | undefined;
  transmitters: SatNogsTransmitter[] | undefined;
  observer: { lat: number; lng: number; alt: number } | null;
  pass: SatellitePass | undefined;
  onClose: () => void;
}

export function SatelliteDetail({
  sat, position, satnogsInfo: info, transmitters,
  observer, pass, onClose,
}: SatelliteDetailProps) {
  return (
    <div className="absolute inset-x-4 top-16 md:top-16 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4 z-50 max-h-[60vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{sat.name}</h3>
          <RadioBadge noradId={sat.id} group={sat.group} />
          {info && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              info.status === 'alive' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
              info.status === 'dead' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
              info.status === 're-entered' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
              'bg-gray-600/20 text-gray-400 border border-gray-600/30'
            }`}>
              {info.status}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-lg leading-none shrink-0 ml-2"
        >
          &times;
        </button>
      </div>

      {/* SatNOGS metadata */}
      {info && (
        <dl className="space-y-1.5 text-xs mb-3 pb-3 border-b border-gray-700/50">
          {info.operator && (
            <div className="flex justify-between">
              <dt className="text-gray-400">Operator</dt>
              <dd className="text-gray-200 text-right max-w-[60%] truncate">{info.operator}</dd>
            </div>
          )}
          {info.countries && (
            <div className="flex justify-between">
              <dt className="text-gray-400">Country</dt>
              <dd className="text-gray-200">{info.countries}</dd>
            </div>
          )}
          {info.launched && (
            <div className="flex justify-between">
              <dt className="text-gray-400">Launched</dt>
              <dd className="text-gray-200 font-mono">{info.launched.split('T')[0]}</dd>
            </div>
          )}
          {info.website && (
            <div className="flex justify-between">
              <dt className="text-gray-400">Website</dt>
              <dd>
                <a href={info.website} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline truncate block max-w-[180px]">
                  {info.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              </dd>
            </div>
          )}
        </dl>
      )}

      {position && (
        <dl className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <dt className="text-gray-400">Latitude</dt>
            <dd className="text-white font-mono">{position.lat.toFixed(4)}&deg;</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-400">Longitude</dt>
            <dd className="text-white font-mono">{position.lng.toFixed(4)}&deg;</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-400">Altitude</dt>
            <dd className="text-white font-mono">{position.alt.toFixed(1)} km</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-400">Velocity</dt>
            <dd className="text-white font-mono">{position.velocity.toFixed(2)} km/s</dd>
          </div>
        </dl>
      )}

      {/* SatNOGS Transmitters */}
      {transmitters && transmitters.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700/50">
          <h4 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
            Transmitters ({transmitters.length})
          </h4>
          <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
            {transmitters.map((tx, i) => (
              <div key={i} className="text-xs bg-gray-900/50 rounded px-2 py-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-gray-300 truncate font-medium">{tx.description}</span>
                  {tx.mode && <span className="text-[10px] text-cyan-400 shrink-0">{tx.mode}</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                  {tx.downlink_low && (
                    <span>
                      <span className="text-gray-600">DL:</span>{' '}
                      <span className="text-green-400 font-mono">{formatFreqHz(tx.downlink_low)}</span>
                    </span>
                  )}
                  {tx.uplink_low && (
                    <span>
                      <span className="text-gray-600">UL:</span>{' '}
                      <span className="text-orange-400 font-mono">{formatFreqHz(tx.uplink_low)}</span>
                    </span>
                  )}
                  {tx.baud && <span className="text-gray-600">{tx.baud} baud</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Radio section */}
      <RadioDetail
        noradId={sat.id}
        satName={sat.name}
        group={sat.group}
        observer={observer}
        pass={pass}
      />
    </div>
  );
}
