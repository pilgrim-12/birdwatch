export interface TLEData {
  name: string;
  line1: string;
  line2: string;
}

export interface SatellitePosition {
  lat: number;
  lng: number;
  alt: number; // km
  velocity: number; // km/s
}

export interface Satellite {
  id: number; // NORAD catalog number
  name: string;
  tle: TLEData;
  position: SatellitePosition | null;
}

export interface ObserverLocation {
  lat: number;
  lng: number;
  alt: number; // meters above sea level
}

export interface LookAngles {
  azimuth: number; // degrees
  elevation: number; // degrees
  rangeSat: number; // km
}
