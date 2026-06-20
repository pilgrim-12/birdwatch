'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { Visitor, VisitorStats } from '@/types/analytics';

const AdminMap = dynamic(() => import('@/components/AdminMap'), { ssr: false });

/** Parse User-Agent to short browser name */
const COUNTRY_TO_CODE: Record<string, string> = {
  'United States': 'US', 'Canada': 'CA', 'United Kingdom': 'UK', 'Germany': 'DE',
  'France': 'FR', 'Italy': 'IT', 'Spain': 'ES', 'Netherlands': 'NL', 'Belgium': 'BE',
  'Sweden': 'SE', 'Norway': 'NO', 'Denmark': 'DK', 'Finland': 'FI', 'Poland': 'PL',
  'Ukraine': 'UA', 'Russia': 'RU', 'Japan': 'JP', 'China': 'CN', 'South Korea': 'KR',
  'India': 'IN', 'Brazil': 'BR', 'Australia': 'AU', 'Mexico': 'MX', 'Argentina': 'AR',
  'Turkey': 'TR', 'Israel': 'IL', 'Croatia': 'HR', 'Czech Republic': 'CZ', 'Czechia': 'CZ',
  'Romania': 'RO', 'Hungary': 'HU', 'Portugal': 'PT', 'Switzerland': 'CH', 'Austria': 'AT',
  'Ireland': 'IE', 'New Zealand': 'NZ', 'Singapore': 'SG', 'Thailand': 'TH',
  'Indonesia': 'ID', 'Malaysia': 'MY', 'Philippines': 'PH', 'Vietnam': 'VN',
  'Colombia': 'CO', 'Chile': 'CL', 'Peru': 'PE', 'Egypt': 'EG', 'South Africa': 'ZA',
  'Nigeria': 'NG', 'Kenya': 'KE', 'Pakistan': 'PK', 'Bangladesh': 'BD', 'Iran': 'IR',
  'Saudi Arabia': 'SA', 'UAE': 'AE', 'Luxembourg': 'LU', 'Greece': 'GR', 'Bulgaria': 'BG',
  'Serbia': 'RS', 'Slovakia': 'SK', 'Slovenia': 'SI', 'Estonia': 'EE', 'Latvia': 'LV',
  'Lithuania': 'LT', 'Georgia': 'GE', 'Taiwan': 'TW', 'Hong Kong': 'HK',
};

function countryFlag(country: string | null): string {
  if (!country) return '';
  const code = COUNTRY_TO_CODE[country] || '';
  if (!code) return '';
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 - 65 + c.charCodeAt(0)));
}

function parseBrowser(ua: string | null): string {
  if (!ua) return '—';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  return 'Other';
}

/** Parse User-Agent to OS */
function parseOS(ua: string | null): string {
  if (!ua) return '—';
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Other';
}

/** Format timestamp to readable date+time */
function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  if (diffMin < 1) return `${time} (just now)`;
  if (diffMin < 60) return `${time} (${diffMin}m ago)`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${time} (${diffHr}h ago)`;
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${date} ${time}`;
}

/** Format duration in seconds to human readable */
function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === 0) return '—';
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  if (min < 60) return `${min}m ${sec}s`;
  const hr = Math.floor(min / 60);
  return `${hr}h ${min % 60}m`;
}

export default function AdminPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [stats, setStats] = useState<VisitorStats>({ today: 0, thisWeek: 0, total: 0, uniqueToday: 0, uniqueWeek: 0, uniqueTotal: 0, topCountries: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminKey, setAdminKey] = useState<string | null>(null);

  // Get admin key from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setAdminKey(params.get('key'));
  }, []);

  // Fetch visitor data
  useEffect(() => {
    if (!adminKey) return;
    setLoading(true);
    fetch('/api/admin/visitors', {
      headers: { Authorization: `Bearer ${adminKey}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error('Unauthorized');
        return r.json();
      })
      .then((data) => {
        setVisitors(data.visitors);
        setStats(data.stats);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [adminKey]);

  // No key provided
  if (adminKey === null) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-2">Access Denied</h1>
          <p className="text-gray-500">Invalid admin key</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <p className="text-gray-400">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">&larr; Back</Link>
        <h1 className="text-lg font-semibold">BirdWatches Admin</h1>
        <span className="text-xs text-gray-600 ml-auto">Last updated: {new Date().toLocaleTimeString()}</span>
      </header>

      <div className="max-w-7xl mx-auto p-4 space-y-4">
        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-2xl font-bold text-cyan-400">{stats.uniqueToday}</div>
            <div className="text-xs text-gray-500 mt-1">Today (unique)</div>
            <div className="text-xs text-gray-600">{stats.today} visits</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-2xl font-bold text-green-400">{stats.uniqueWeek}</div>
            <div className="text-xs text-gray-500 mt-1">This Week (unique)</div>
            <div className="text-xs text-gray-600">{stats.thisWeek} visits</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-2xl font-bold text-orange-400">{stats.uniqueTotal}</div>
            <div className="text-xs text-gray-500 mt-1">Total (unique)</div>
            <div className="text-xs text-gray-600">{stats.total} visits</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-2xl font-bold text-purple-400">{stats.topCountries[0]?.country || '—'}</div>
            <div className="text-xs text-gray-500 mt-1">Top Country</div>
          </div>
        </div>

        {/* Map + Top Countries side by side */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Map */}
          <div className="md:col-span-3 bg-gray-900 rounded-xl border border-gray-800 overflow-hidden h-[300px] md:h-[400px]">
            <AdminMap visitors={visitors} />
          </div>

          {/* Top Countries */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Top Countries</h3>
            <div className="space-y-2">
              {stats.topCountries.map((c) => (
                <div key={c.country} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{countryFlag(c.country)} {c.country}</span>
                  <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{c.count}</span>
                </div>
              ))}
              {stats.topCountries.length === 0 && (
                <p className="text-xs text-gray-600">No data yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Unique visitors grouped by IP */}
        {(() => {
          const byIp = new Map<string, { ip: string; visits: number; firstSeen: string; lastSeen: string; totalDuration: number; location: string; country: string | null; browser: string; os: string }>();
          for (const v of visitors) {
            const existing = byIp.get(v.ip);
            const loc = v.city && v.country ? `${v.city}, ${v.country}` : v.country || '—';
            if (existing) {
              existing.visits++;
              if (v.created_at < existing.firstSeen) existing.firstSeen = v.created_at;
              if (v.created_at > existing.lastSeen) existing.lastSeen = v.created_at;
              if (v.duration) existing.totalDuration += v.duration;
            } else {
              byIp.set(v.ip, {
                ip: v.ip, visits: 1,
                firstSeen: v.created_at, lastSeen: v.created_at,
                totalDuration: v.duration || 0,
                location: loc,
                country: v.country,
                browser: parseBrowser(v.user_agent),
                os: parseOS(v.user_agent),
              });
            }
          }
          const grouped = [...byIp.values()].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
          return (
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800">
                <h3 className="text-sm font-semibold text-gray-400">Unique Visitors ({grouped.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
                      <th className="px-4 py-2 font-medium">IP</th>
                      <th className="px-4 py-2 font-medium">Location</th>
                      <th className="px-4 py-2 font-medium">Visits</th>
                      <th className="px-4 py-2 font-medium">Total Time</th>
                      <th className="px-4 py-2 font-medium">First Seen</th>
                      <th className="px-4 py-2 font-medium">Last Seen</th>
                      <th className="px-4 py-2 font-medium">Browser</th>
                      <th className="px-4 py-2 font-medium">OS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped.map((g) => (
                      <tr key={g.ip} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="px-4 py-2 text-gray-300 font-mono text-xs">{g.ip}</td>
                        <td className="px-4 py-2 text-gray-300">{countryFlag(g.country)} {g.location}</td>
                        <td className="px-4 py-2 text-cyan-400 font-medium">{g.visits}</td>
                        <td className="px-4 py-2 text-gray-400">{formatDuration(g.totalDuration || null)}</td>
                        <td className="px-4 py-2 text-gray-400 whitespace-nowrap">{formatTime(g.firstSeen)}</td>
                        <td className="px-4 py-2 text-gray-400 whitespace-nowrap">{formatTime(g.lastSeen)}</td>
                        <td className="px-4 py-2 text-gray-400">{g.browser}</td>
                        <td className="px-4 py-2 text-gray-400">{g.os}</td>
                      </tr>
                    ))}
                    {grouped.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-600">
                          No visitors yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
