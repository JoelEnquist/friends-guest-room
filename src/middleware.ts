import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type Entry = {
  count: number;
  resetAt: number;
};

const globalForRateLimit = globalThis as unknown as {
  rateLimitStore?: Map<string, Entry>;
};

const store = globalForRateLimit.rateLimitStore ?? new Map<string, Entry>();
globalForRateLimit.rateLimitStore = store;

function enforceRateLimit(
  request: NextRequest,
  scope: string,
  limit: number,
  windowMs: number,
): NextResponse | null {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (existing.count >= limit) {
    const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
    return NextResponse.json(
      { error: 'Too many requests. Please try again shortly.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
        },
      },
    );
  }

  existing.count += 1;
  store.set(key, existing);
  return null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/auth')) {
    const blocked = enforceRateLimit(request, 'auth', 20, 5 * 60 * 1000);
    if (blocked) return blocked;
  }

  if (pathname.startsWith('/api/invite-requests')) {
    const blocked = enforceRateLimit(request, 'invite-request', 10, 10 * 60 * 1000);
    if (blocked) return blocked;
  }

  if (pathname.startsWith('/api/suggestions')) {
    const blocked = enforceRateLimit(request, 'suggestions', 8, 60 * 60 * 1000);
    if (blocked) return blocked;
  }

  if (pathname.startsWith('/api/bookings') || pathname.startsWith('/api/admin/bookings')) {
    const blocked = enforceRateLimit(request, 'booking', 60, 60 * 1000);
    if (blocked) return blocked;
  }

  if (pathname.startsWith('/api/admin/suggestions')) {
    const blocked = enforceRateLimit(request, 'admin-suggestions', 120, 60 * 60 * 1000);
    if (blocked) return blocked;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/auth/:path*',
    '/api/invite-requests/:path*',
    '/api/suggestions/:path*',
    '/api/bookings/:path*',
    '/api/admin/bookings/:path*',
    '/api/admin/suggestions/:path*',
  ],
};
