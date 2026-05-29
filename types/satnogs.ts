export interface SatNogsInfo {
  status: 'alive' | 'dead' | 're-entered' | 'future';
  launched: string | null;
  operator: string;
  countries: string;
  website: string;
  image: string | null;
}

export interface SatNogsTransmitter {
  description: string;
  downlink_low: number | null;
  downlink_high: number | null;
  uplink_low: number | null;
  uplink_high: number | null;
  mode: string | null;
  baud: number | null;
  type: string;
  service: string;
}
