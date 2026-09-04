/**
 * Space-Track.org access. CelesTrak's public feed stops at catalog number
 * 69998 and carries no Alpha-5 objects at all, so anything numbered 100000+
 * — recent launches, among them half of the Rassvet constellation — is only
 * reachable from the NORAD catalogue directly.
 *
 * Credentials come from SPACETRACK_IDENTITY / SPACETRACK_PASSWORD. Without
 * them every call resolves to null and callers fall back to CelesTrak alone.
 */

const BASE_URL = 'https://www.space-track.org';

/** Space-Track allows 30 requests/min and 300/hour; one hour matches the CelesTrak route. */
const RESULT_TTL_MS = 60 * 60_000;
const SESSION_TTL_MS = 30 * 60_000;

let session: { cookie: string; at: number } | null = null;
const results = new Map<string, { text: string; at: number }>();

export function isSpaceTrackConfigured(): boolean {
  return Boolean(process.env.SPACETRACK_IDENTITY && process.env.SPACETRACK_PASSWORD);
}

async function login(): Promise<string | null> {
  if (session && Date.now() - session.at < SESSION_TTL_MS) return session.cookie;

  const body = new URLSearchParams({
    identity: process.env.SPACETRACK_IDENTITY ?? '',
    password: process.env.SPACETRACK_PASSWORD ?? '',
  });

  const res = await fetch(`${BASE_URL}/ajaxauth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });
  if (!res.ok) return null;

  // The session cookie is the whole auth story for subsequent queries.
  const raw = res.headers.get('set-cookie');
  const cookie = raw?.split(';')[0];
  if (!cookie) return null;

  session = { cookie, at: Date.now() };
  return cookie;
}

async function query(path: string): Promise<string | null> {
  let cookie = await login();
  if (!cookie) return null;

  let res = await fetch(`${BASE_URL}${path}`, {
    headers: { Cookie: cookie },
    cache: 'no-store',
  });

  // An expired session reads as 401; drop it and try once with a fresh login.
  if (res.status === 401) {
    session = null;
    cookie = await login();
    if (!cookie) return null;
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { Cookie: cookie },
      cache: 'no-store',
    });
  }

  if (!res.ok) return null;
  return res.text();
}

/**
 * On-orbit objects whose name contains `fragment`, as three-line TLE text with
 * the same shape CelesTrak returns. Null when unconfigured or unreachable —
 * never throws, because this is a supplement and must not break the response.
 */
export async function fetchByName(fragment: string): Promise<string | null> {
  if (!isSpaceTrackConfigured()) return null;

  const key = fragment.toUpperCase();
  const hit = results.get(key);
  if (hit && Date.now() - hit.at < RESULT_TTL_MS) return hit.text;

  try {
    const path =
      `/basicspacedata/query/class/gp/OBJECT_NAME/~~${encodeURIComponent(key)}` +
      `/orderby/NORAD_CAT_ID/format/3le`;
    const raw = await query(path);
    if (raw === null) return null;

    // 3LE prefixes each name line with "0 "; strip it so the text parses as
    // the plain three-line format used everywhere else.
    const text = raw
      .split('\n')
      .map((line) => (line.startsWith('0 ') ? line.slice(2).trim() : line.trim()))
      .filter((line) => line.length > 0)
      .join('\n');

    results.set(key, { text, at: Date.now() });
    return text;
  } catch {
    return null;
  }
}
