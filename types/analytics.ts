export interface Visitor {
  id: number;
  created_at: string;
  last_seen: string | null;
  ip: string;
  country: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  user_agent: string | null;
  path: string | null;
  referer: string | null;
  duration: number | null;
  visit_count: number | null;
}

export interface VisitorStats {
  today: number;
  thisWeek: number;
  total: number;
  uniqueToday: number;
  uniqueWeek: number;
  uniqueTotal: number;
  topCountries: { country: string; count: number }[];
}
