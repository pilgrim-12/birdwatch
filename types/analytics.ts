export interface Visitor {
  id: number;
  created_at: string;
  ip: string;
  country: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  user_agent: string | null;
  path: string | null;
  referer: string | null;
}

export interface VisitorStats {
  today: number;
  thisWeek: number;
  total: number;
  topCountries: { country: string; count: number }[];
}
