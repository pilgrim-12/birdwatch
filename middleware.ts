import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const response = NextResponse.next();

  // Only track page views (not API, static, etc.)
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return response;
  }

  // Don't track admin page
  if (pathname.startsWith('/admin')) {
    return response;
  }

  // Fire-and-forget tracking (non-blocking)
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  const trackUrl = new URL('/api/track', req.url);

  fetch(trackUrl.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ip,
      userAgent: req.headers.get('user-agent'),
      path: pathname,
      referer: req.headers.get('referer'),
    }),
  }).catch(() => {});

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
