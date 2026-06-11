export interface GroundStation {
  id: number;
  name: string;
  lat: number;
  lng: number;
  alt: number; // meters above sea level
  network: 'satnogs' | 'dsn' | 'estrack' | 'noaa' | 'isro' | 'jaxa' | 'roscosmos' | 'cnsa' | 'ksat' | 'launch' | 'other';
  status: 'online' | 'testing' | 'offline';
  owner?: string;
  antennas?: string[];
  observations?: number;
  image?: string;
}
