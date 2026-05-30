'use client';

import { useEffect, useRef } from 'react';

const HEARTBEAT_INTERVAL = 30_000; // 30s

export default function VisitorTracker() {
  const sessionIdRef = useRef<number | null>(null);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    // Don't track admin pages
    if (window.location.pathname.startsWith('/admin')) return;

    let heartbeatTimer: ReturnType<typeof setInterval>;

    // Create or resume session
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: window.location.pathname,
        referer: document.referrer || null,
        userAgent: navigator.userAgent,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
          sessionIdRef.current = data.id;
          startRef.current = Date.now();

          // Start heartbeat
          heartbeatTimer = setInterval(() => {
            const duration = Math.floor((Date.now() - startRef.current) / 1000);
            fetch('/api/track', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: sessionIdRef.current, duration }),
            }).catch(() => {});
          }, HEARTBEAT_INTERVAL);
        }
      })
      .catch(() => {});

    // Send final duration on page close
    const handleUnload = () => {
      if (!sessionIdRef.current) return;
      const duration = Math.floor((Date.now() - startRef.current) / 1000);
      navigator.sendBeacon(
        '/api/track',
        new Blob(
          [JSON.stringify({ id: sessionIdRef.current, duration, _method: 'PATCH' })],
          { type: 'application/json' },
        ),
      );
    };

    window.addEventListener('beforeunload', handleUnload);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') handleUnload();
    });

    return () => {
      clearInterval(heartbeatTimer);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  return null;
}
