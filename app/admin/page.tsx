'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { Visitor, VisitorStats } from '@/types/analytics';

const AdminMap = dynamic(() => import('@/components/AdminMap'), { ssr: false });

/** Parse User-Agent to short browser name */
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
  const [stats, setStats] = useState<VisitorStats>({ today: 0, thisWeek: 0, total: 0, topCountries: [] });
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
            <div className="text-2xl font-bold text-cyan-400">{stats.today}</div>
            <div className="text-xs text-gray-500 mt-1">Today</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-2xl font-bold text-green-400">{stats.thisWeek}</div>
            <div className="text-xs text-gray-500 mt-1">This Week</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-2xl font-bold text-orange-400">{stats.total}</div>
            <div className="text-xs text-gray-500 mt-1">Total</div>
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
                  <span className="text-sm text-gray-300">{c.country}</span>
                  <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{c.count}</span>
                </div>
              ))}
              {stats.topCountries.length === 0 && (
                <p className="text-xs text-gray-600">No data yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Visitor list */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <h3 className="text-sm font-semibold text-gray-400">Recent Visitors ({visitors.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
                  <th className="px-4 py-2 font-medium">Time</th>
                  <th className="px-4 py-2 font-medium">IP</th>
                  <th className="px-4 py-2 font-medium">Location</th>
                  <th className="px-4 py-2 font-medium">Duration</th>
                  <th className="px-4 py-2 font-medium">Visits</th>
                  <th className="px-4 py-2 font-medium">Page</th>
                  <th className="px-4 py-2 font-medium">Browser</th>
                  <th className="px-4 py-2 font-medium">OS</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map((v) => (
                  <tr key={v.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-2 text-gray-400 whitespace-nowrap">{formatTime(v.created_at)}</td>
                    <td className="px-4 py-2 text-gray-300 font-mono text-xs">{v.ip}</td>
                    <td className="px-4 py-2 text-gray-300">
                      {v.city && v.country ? `${v.city}, ${v.country}` : v.country || '—'}
                    </td>
                    <td className="px-4 py-2 text-gray-400">{formatDuration(v.duration)}</td>
                    <td className="px-4 py-2 text-gray-400">{v.visit_count || 1}</td>
                    <td className="px-4 py-2 text-gray-400">{v.path || '/'}</td>
                    <td className="px-4 py-2 text-gray-400">{parseBrowser(v.user_agent)}</td>
                    <td className="px-4 py-2 text-gray-400">{parseOS(v.user_agent)}</td>
                  </tr>
                ))}
                {visitors.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-600">
                      No visitors yet. Data will appear after the first visit.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
